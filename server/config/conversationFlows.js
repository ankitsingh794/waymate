/*
 * This file defines the step-by-step logic for conversations.
 * 'slots' determines the order of questions.
 * 'definition' provides the question text, reprompts for when the AI is confused,
 * and validation hints for parsing the user's answer.
 */
const flows = {
    create_trip: {
        slots: ['destination', 'vibe', 'dates', 'travelers', 'budget', 'transportMode', 'interests'],
        definition: {
            destination: {
                question: "Of course! I'd love to help you plan your journey. Where are you thinking of going?",
                reprompt: "Please tell me the city or country you'd like to visit.",
                validation: { type: 'string' }
            },
            vibe: {
                question: "Got it! What's the vibe for this trip? (e.g., a fast-paced adventure, a slow and relaxing getaway, or a romantic escape?)",
                reprompt: "Tell me what kind of feeling you're going for, like 'relaxing' or 'adventurous'.",
                validation: { type: 'string' } 
            },
            dates: {
                question: "That sounds wonderful! When would you like to travel? (e.g., 'next weekend', 'August 10th to 15th')",
                reprompt: "I need to know the dates for your trip. For example, 'next Friday for a week'.",
                validation: { type: 'date_range' }
            },
            travelers: {
                question: "Got it. How many people will be traveling?",
                reprompt: "Just a number, please. How many travelers?",
                validation: { type: 'number' }
            },
            budget: {
                question: "Great, that helps a lot. Finally, what's your budget for this trip? (e.g., budget-friendly, standard, or luxury)",
                reprompt: "Are you looking for a budget-friendly, standard, or luxury experience?",
                validation: { type: 'choice', options: ['budget', 'standard', 'luxury'] }
            },
            transportMode: {
                question: "How do you prefer to travel for the main part of your journey? (e.g., flight, train, or bus)",
                reprompt: "Please let me know your preferred mode of travel, like flight or train.",
                validation: { type: 'choice', options: ['flight', 'train', 'bus', 'any'] }
            },
            interests: {
                question: "Perfect. To make this plan truly yours, what kind of activities do you enjoy? (e.g., adventure, food, history, relaxing)",
                reprompt: "Tell me a few things you'd like to do, like 'visiting historical sites' or 'relaxing by the pool'.",
                validation: { type: 'list' }
            }
        }
    }
};

module.exports = { flows };