

exports.flows = {
    // Flow for creating a trip
  create_trip: {
    // The sequence of information we need to collect from the user.
    slots: ['destination', 'dates', 'interests', 'budget'],

    // Defines the properties for each slot.
    definition: {
      destination: {
        question: "Of course! I'd love to help you plan your journey. Where are you thinking of going?",
        // 'nextSlot' points to the next piece of information we need.
        nextSlot: 'dates'
      },
      dates: {
        question: "That sounds like a wonderful destination! When would you like to travel?",
        // This 'validation' hint can be used later to guide the AI in parsing the user's response.
        validation: { type: 'date_range' },
        nextSlot: 'interests'
      },
      interests: {
        question: "Perfect. To make this plan truly yours, what kind of activities do you enjoy? (e.g., adventure, food, history, relaxing)",
        validation: { type: 'list' },
        nextSlot: 'budget'
      },
      budget: {
        question: "Great, that helps a lot. Finally, what's your budget for this trip? (e.g., budget-friendly, standard, or luxury)",
        validation: { type: 'choice', options: ['budget', 'standard', 'luxury'] },
        // 'final' signifies that this is the last piece of information needed.
        nextSlot: 'final'
      }
    },
    

    action: 'tripService.createTrip'
  }
  // Future flows like 'edit_trip' or 'book_hotel' can be added here.
};
