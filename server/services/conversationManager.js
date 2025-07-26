const { getCache, setCache, deleteCache } = require('../config/redis');
const { flows } = require('../config/conversationFlows');
const aiParser = require('./aiParsingService');

class ConversationManager {
  constructor(userId) {
    this.userId = userId;
    this.stateKey = `conversation:${this.userId}`;
    this.ttl = 600; // 10 minutes
  }

  async handleMessage(message, initialDetails = {}) {
    let state = await this.getState();

    if (!state) {
      // This is the start of a new conversation
      state = await this.startConversation('create_trip', initialDetails);
    } else {
      // This is a continuing conversation, so we process the user's answer
      const currentSlotName = this.getCurrentSlot(state);
      const flow = flows[state.intent];
      const slotDefinition = flow.definition[currentSlotName];
      
      // Use the specialized AI parser to extract the specific piece of info we asked for
      const extractedData = await aiParser.extractEntityForSlot(message, slotDefinition);
      
      if (extractedData !== null && extractedData !== undefined) {
        state.collectedData[currentSlotName] = extractedData;
      } else {
        // If the AI can't understand the user's answer, ask again with a hint
        return {
          reply: `I didn't quite catch that. ${slotDefinition.reprompt}`,
          action: null
        };
      }
    }

    // After starting or processing, find the next required piece of information
    const nextSlotName = this.findNextMissingSlot(state);

    if (nextSlotName) {
      // If there's more information to collect, update the state and ask the next question.
      state.status = `pending_${nextSlotName}`;
      await this.saveState(state);
      return {
        reply: this.getQuestionForSlot(nextSlotName),
        action: null
      };
    } else {
      // All information has been collected and the conversation is complete.
      await this.endConversation();
      const finalData = this.mapDataForService(state.collectedData);
      return {
        reply: "Perfect! I have everything I need. Give me a moment to craft your personalized trip...",
        action: 'trigger_trip_creation',
        data: finalData
      };
    }
  }

  async startConversation(intent, initialDetails) {
    const state = {
      intent,
      status: 'pending', // Will be updated to pending_the_first_slot
      collectedData: initialDetails || {}
    };
    return state;
  }
  
  findNextMissingSlot(state) {
    const flow = flows[state.intent];
    return flow.slots.find(slot => !state.collectedData.hasOwnProperty(slot));
  }

  getQuestionForSlot(slotName) {
    const flow = flows['create_trip'];
    return flow.definition[slotName].question;
  }

  getCurrentSlot(state) {
    return state.status.replace('pending_', '');
  }

  mapDataForService(collectedData) {
    const { budget, interests, travelers, preferences, ...rest } = collectedData;
    const finalAccommodationType = preferences?.accommodationType || budget;
    const finalInterests = preferences?.interests || interests;
    return {
      ...rest, 
      travelers: travelers || 1,
      preferences: {
        accommodationType: finalAccommodationType,
        interests: Array.isArray(finalInterests) ? finalInterests : [finalInterests].filter(Boolean)
      }
    };
  }

  async getState() { return await getCache(this.stateKey); }
  async saveState(state) { await setCache(this.stateKey, state, this.ttl); }
  async endConversation() { await deleteCache(this.stateKey); }
}

module.exports = ConversationManager;
