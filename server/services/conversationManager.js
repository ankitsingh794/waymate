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

  /**
   * ENHANCED: Handles incoming messages by checking the current state and
   * intelligently deciding whether to ask for the next piece of missing information
   * or to process a user's answer to a previous question.
   */
  async handleMessage(message, initialDetails = {}) {
    let state = await this.getState();

    // If no active conversation, start a new one with any pre-filled details.
    if (!state) {
      state = await this.startConversation('create_trip', initialDetails);
    } else {
      // An active conversation exists, so we process the user's message as an answer.
      const flow = flows[state.intent];
      const currentSlotName = this.getCurrentSlot(state);
      const slotDefinition = flow.definition[currentSlotName];

      // Use AI to parse the user's message into structured data for the current question.
      const extractedData = await aiParser.extractEntityForSlot(message, slotDefinition);
      
      // Merge the extracted data into our collected data object.
      state.collectedData[currentSlotName] = extractedData;
    }

    // Now, find the next *missing* slot to ask about.
    const nextSlotName = this.findNextMissingSlot(state);

    if (nextSlotName) {
      // If there's more information to collect, update the state and ask the next question.
      state.status = `pending_${nextSlotName}`;
    } else {
      // All information has been collected.
      state.status = 'complete';
    }
    
    await this.saveState(state);

    // --- Respond to the user ---
    if (state.status === 'complete') {
      await this.endConversation();
      const finalData = this.mapDataForService(state.collectedData);
      return {
        reply: "Perfect! I have everything I need. Give me a moment to craft your personalized trip...",
        action: 'trigger_trip_creation',
        data: finalData
      };
    } else {
      // Ask the next question.
      return {
        reply: this.getQuestionForSlot(nextSlotName),
        action: null
      };
    }
  }

  /**
   * ENHANCED: Starts a new conversation, pre-filling the `collectedData`
   * with any details extracted from the user's initial message.
   */
  async startConversation(intent, initialDetails) {
    const state = {
      intent,
      status: 'pending', // Status will be determined by the first missing slot.
      collectedData: initialDetails || {}
    };
    logger.info(`Started conversation for intent '${intent}' with user ${this.userId}`, { initialDetails });
    return state;
  }

  // --- Helper methods ---

  findNextMissingSlot(state) {
    const flow = flows[state.intent];
    // Find the first slot from the flow's defined sequence that does NOT exist in the collectedData.
    return flow.slots.find(slot => !state.collectedData.hasOwnProperty(slot));
  }
  
  getQuestionForSlot(slotName) {
    const flow = flows['create_trip']; // Assuming one flow for now
    return flow.definition[slotName].question;
  }
  
  getCurrentSlot(state) {
    return state.status.replace('pending_', '');
  }

  mapDataForService(collectedData) {
      const { budget, interests, ...rest } = collectedData;
      return {
          ...rest,
          preferences: {
              accommodationType: budget,
              interests: interests
          }
      };
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