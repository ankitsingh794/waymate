module.exports = {
    BUDGET_CONFIG: {
        LOCATION_TIERS: {
            'Goa': 'tier-1-resort',
            'Andaman and Nicobar Islands': 'tier-1-resort',
            'Mumbai': 'metro-luxury',
            'Delhi': 'metro-luxury',
            'Bangalore': 'tier-1-city',
            'Pune': 'tier-1-city',
            'Leh': 'himalayan-peak',
            'default': 'tier-2-city'
        },

        ACCOMMODATION_COSTS: {
            'metro-luxury': { budget: 3500, standard: 7000, luxury: 15000 },
            'tier-1-resort': { budget: 4000, standard: 8000, luxury: 20000 },
            'tier-1-city': { budget: 2500, standard: 5000, luxury: 10000 },
            'himalayan-peak': { budget: 3000, standard: 6000, luxury: 12000 },
            'tier-2-city': { budget: 1200, standard: 2500, luxury: 6000 },
        },

        FOOD_COSTS_PER_DAY: {
            budget: 800,
            standard: 1500,
            luxury: 4000
        },

        ACTIVITY_COSTS: {
            AVG_COST_PER_ATTRACTION_PERSON: 500
        }
    }
};