/*
 * This file defines the step-by-step logic for conversations.
 * 'slots' determines the order of questions.
 * 'definition' provides the question text, reprompts for when the AI is confused,
 * and validation hints for parsing the user's answer.
 */
const flows = {
    create_trip: {
        slots: ['destination', 'dates', 'travelers', 'budget', 'interests'],
        definition: {
            destination: {
                question: "Of course! I'd love to help you plan your journey. Where are you thinking of going?",
                reprompt: "Please tell me the city or country you'd like to visit.",
                validation: { type: 'string' }
            },
            dates: {
                question: "That sounds like a wonderful destination! When would you like to travel? (e.g., 'next weekend', 'August 10th to 15th')",
                reprompt: "I need to know the dates for your trip. For example, 'next Friday for a week'.",
                validation: { type: 'date_range' }
            },
            travelers: {
                question: "Got it. How many people will be traveling?",
                reprompt: "Just a number, please. How many travelers?",
                validation: { type: 'number' }
            },
            interests: {
                question: "Perfect. To make this plan truly yours, what kind of activities do you enjoy? (e.g., adventure, food, history, relaxing)",
                reprompt: "Tell me a few things you'd like to do, like 'visiting historical sites' or 'relaxing by the pool'.",
                validation: { type: 'list' }
            },
            budget: {
                question: "Great, that helps a lot. Finally, what's your budget for this trip? (e.g., budget-friendly, standard, or luxury)",
                reprompt: "Are you looking for a budget-friendly, standard, or luxury experience?",
                validation: { type: 'choice', options: ['budget', 'standard', 'luxury'] }
            }
        }
    }
};

module.exports = { flows };
