import { VscStarFull } from 'react-icons/vsc';
import './Feedback.css';

const TestimonialCard = ({ avatar, name, role, signal, text }) => (
    <article className="home-testimonial-card">
        <div className="home-testimonial-topline">
            <div className="home-testimonial-stars" aria-label="5 star rating">
                {[...Array(5)].map((_, i) => (
                    <VscStarFull key={i} aria-hidden="true" />
                ))}
            </div>
            <span className="home-testimonial-signal">{signal}</span>
        </div>

        <blockquote>{text}</blockquote>

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
        avatar: 'NK',
        name: 'Nina Kapoor',
        role: 'Remote creative lead',
        signal: '2-city workcation',
        text: '"WayMate translated a messy team brief into a schedule we could actually execute. We stopped arguing about logistics and started looking forward to the trip."',
    },
    {
        avatar: 'TR',
        name: 'Theo Ramirez',
        role: 'Family travel planner',
        signal: 'Family itinerary',
        text: '"The route sequencing was the difference maker. We avoided backtracking, kept everyone’s pace in check, and still had room for spontaneous detours."',
    },
    {
        avatar: 'AL',
        name: 'Ari Levin',
        role: 'Founder and frequent flyer',
        signal: 'Time-critical travel',
        text: '"When a train delay disrupted our day, alternatives appeared instantly with trade-offs explained. It felt like having an operations editor in our pocket."',
    },
];

export default function Feedback() {
    return (
        <section className="home-feedback-section">
            <div className="home-feedback-shell">
                <header className="home-feedback-header">
                    <span className="home-section-kicker">Social Proof</span>
                    <h2>Teams and travelers trust WayMate when decisions need to move fast.</h2>
                    <p>
                        Field-tested feedback from users planning group escapes, focused workcations, and
                        high-constraint itineraries.
                    </p>
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
