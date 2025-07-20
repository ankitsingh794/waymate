const redis = require('../config/redis');
const { flows } = require('../config/conversationFlows');
const aiParser = require('./aiParsingService'); 
const logger = require('../utils/logger');

class ConversationManager {
  constructor(userId) {
    this.userId = userId;
    this.stateKey = `conversation:${this.userId}`;
    this.ttl = 600; // 10 minutes
  }

  async handleMessage(message) {
    let state = await this.getState();

    if (!state) {
      // No active conversation, so we start a new one.
      const { intent, entity } = await aiParser.detectIntentAndExtractEntity(message);

      if (intent === 'create_trip') {
        state = await this.startConversation(intent, entity);
      } else {
        // For now, other intents are treated as casual chat and don't start a stateful conversation.
        // TODO: Implement handlers for 'edit_trip', 'get_trip_detail', etc.
        return { reply: "This is a casual chat response for now.", action: null };
      }
    } else {
      // An active conversation exists, so we process the message as an answer.
      const flow = flows[state.intent];
      const currentSlotName = this.getCurrentSlot(state);
      const slotDefinition = flow.definition[currentSlotName];

      // Use AI to parse the user's message into structured data.
      const extractedData = await aiParser.extractEntityForSlot(message, slotDefinition);
      
      // Merge the extracted data into our collected data object.
      // If extractedData is an object (like for dates), we spread it. Otherwise, we assign it.
      if (typeof extractedData === 'object' && !Array.isArray(extractedData)) {
         Object.assign(state.collectedData, extractedData);
      } else {
         state.collectedData[currentSlotName] = extractedData;
      }

      const nextSlotName = slotDefinition.nextSlot;
      state.status = (nextSlotName === 'final') ? 'complete' : `pending_${nextSlotName}`;
    }

    await this.saveState(state);

    if (state.status === 'complete') {
      await this.endConversation();
      // Remap keys to match what tripService expects (e.g., 'budget' -> 'accommodationType')
      const finalData = this.mapDataForService(state.collectedData);
      return {
        reply: "Perfect! I have everything I need. Give me a moment to craft your personalized trip...",
        action: 'trigger_trip_creation',
        data: finalData
      };
    } else {
      return {
        reply: this.getNextQuestion(state),
        action: null
      };
    }
  }

  async startConversation(intent, initialEntity) {
    const flow = flows[intent];
    const firstSlot = flow.slots[0]; // 'destination'

    const state = {
      intent,
      status: `pending_${flow.definition[firstSlot].nextSlot}`, // 'pending_dates'
      collectedData: { [firstSlot]: initialEntity }
    };
    await this.saveState(state);
    logger.info(`Started conversation for intent '${intent}' with user ${this.userId}`);
    return state;
  }
  
  mapDataForService(collectedData) {
      // The tripService expects `accommodationType` in the `preferences` object.
      // Our conversational flow collects `budget` as a top-level key.
      // This function remaps the data to the correct structure.
      const { budget, interests, ...rest } = collectedData;
      return {
          ...rest,
          preferences: {
              accommodationType: budget,
              interests: interests
          }
      };
  }

  // --- Helper methods ---

  getNextQuestion(state) {
    const flow = flows[state.intent];
    const nextSlotName = state.status.replace('pending_', '');
    return flow.definition[nextSlotName].question;
  }

  getCurrentSlot(state) {
    return state.status.replace('pending_', '');
  }

  async getState() {
    const state = await redis.get(this.stateKey);
    return state ? JSON.parse(state) : null;
  }

  async saveState(state) {
    await redis.set(this.stateKey, JSON.stringify(state), 'EX', this.ttl);
  }

  async endConversation() {
    await redis.del(this.stateKey);
    logger.info(`Ended conversation for user ${this.userId}`);
  }
}

module.exports = ConversationManager;
