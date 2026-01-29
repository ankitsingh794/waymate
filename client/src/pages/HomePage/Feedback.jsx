import './Feedback.css';

// Testimonial card component
const TestimonialCard = ({ avatar, name, role, text }) => (
    <div className="testimonial-card">
        <div className="stars">
            {[...Array(5)].map((_, i) => (
                <span key={i}>★</span>
            ))}
        </div>
        <p>"{text}"</p>
        <div className="testimonial-author">
            <div className="author-avatar">{avatar}</div>
            <div className="author-info">
                <strong>{name}</strong>
                <span>{role}</span>
            </div>
        </div>
    </div>
);

// Testimonials data
const testimonialsData = [
    {
        avatar: 'SA',
        name: 'Sarah Anderson',
        role: 'Travel Enthusiast',
        text: 'WayMate helped me plan the most amazing trip to Bali! The AI recommendations were spot-on.'
    },
    {
        avatar: 'MJ',
        name: 'Michael Jones',
        role: 'Adventure Seeker',
        text: 'Finally, a travel planner that actually understands my budget constraints and preferences!'
    },
    {
        avatar: 'EP',
        name: 'Emily Parker',
        role: 'Digital Nomad',
        text: 'The itinerary generator saved me hours of planning. Highly recommend to every traveler!'
    }
];

export default function Feedback() {
    return (
        <div className="feedback-container">
            <div className="feedback-title">What Our Travelers Say</div>
            <div className="feedback-grid">
                {testimonialsData.map((testimonial, i) => (
                    <TestimonialCard key={i} {...testimonial} />
                ))}
            </div>
        </div>
    );
}
