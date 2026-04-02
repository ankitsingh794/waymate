import './Feedback.css';

const TestimonialCard = ({ avatar, name, role, text }) => (
    <article className="home-testimonial-card">
        <div className="home-testimonial-stars" aria-label="5 star rating">
            {[...Array(5)].map((_, i) => (
                <span key={i}>*</span>
            ))}
        </div>
        <p>{text}</p>
        <div className="home-testimonial-author">
            <div className="home-author-avatar">{avatar}</div>
            <div className="home-author-info">
                <strong>{name}</strong>
                <span>{role}</span>
            </div>
        </div>
    </article>
);

const testimonialsData = [
    {
        avatar: 'SA',
        name: 'Sarah Anderson',
        role: 'Travel enthusiast',
        text: 'WayMate mapped our Bali plans in minutes. It felt like planning with someone who already knew us.',
    },
    {
        avatar: 'MJ',
        name: 'Michael Jones',
        role: 'Adventure seeker',
        text: 'I could finally balance budget and experiences without juggling ten different tools and tabs.',
    },
    {
        avatar: 'EP',
        name: 'Emily Parker',
        role: 'Digital nomad',
        text: 'The route planning and itinerary flow are clean, quick, and reliable on both phone and laptop.',
    },
];

export default function Feedback() {
    return (
        <section className="home-feedback-section">
            <div className="home-feedback-shell">
                <header className="home-feedback-header">
                    <h2>Loved by modern travelers</h2>
                    <p>Real feedback from people using WayMate to build better travel plans with less friction.</p>
                </header>

                <div className="home-feedback-grid">
                    {testimonialsData.map((testimonial) => (
                        <TestimonialCard key={testimonial.name} {...testimonial} />
                    ))}
                </div>
            </div>
        </section>
    );
}
