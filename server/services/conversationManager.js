const { getCache, setCache, deleteCache } = require('../config/redis');
const { flows } = require('../config/conversationFlows');
const aiParser = require('./aiParsingService');


function validateSlotData(slotName, data) {
  if (slotName === 'dates') {
    return typeof data === 'object' && data !== null && data.startDate && data.endDate;
  }
  return true;
}


class ConversationManager {
  constructor(userId) {
    this.userId = userId;
    this.stateKey = `conversation:${this.userId}`;
    this.ttl = 600; // 10 minutes
  }

  async handleMessage(message, initialDetails = {}) {
    let state = await this.getState();

    if (!state) {
      state = await this.startConversation('create_trip', initialDetails);
    } else {
      const currentSlotName = this.getCurrentSlot(state);
      const flow = flows[state.intent];
      const slotDefinition = flow.definition[currentSlotName];

      const extractedData = await aiParser.extractEntityForSlot(message, slotDefinition);

      if (extractedData !== null && validateSlotData(currentSlotName, extractedData)) {
        state.collectedData[currentSlotName] = extractedData;
      } else {
        return {
          reply: `I didn't quite catch that. ${slotDefinition.reprompt}`,
          action: null
        };
      }
    }

    const nextSlotName = this.findNextMissingSlot(state);

    if (nextSlotName) {
      state.status = `pending_${nextSlotName}`;
      await this.saveState(state);
      return {
        reply: this.getQuestionForSlot(nextSlotName),
        action: null
      };
    } else {
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
      status: 'pending',
      collectedData: initialDetails || {}
    };
    await this.saveState(state);
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

    const finalTravelers = parseInt(travelers, 10) || 1;

    return {
      ...rest,
      travelers: finalTravelers,
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