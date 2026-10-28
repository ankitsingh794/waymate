import { VscStarFull } from 'react-icons/vsc';
import './Feedback.css';

/*
 * Feedback.jsx — Testimonials section (Phase 4A)
 * Plan spec: Infinite marquee — duplicate testimonial array, run
 * @keyframes marquee, pause on hover.
 */

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
        text: '"The route sequencing was the difference maker. We avoided backtracking, kept everyone\'s pace in check, and still had room for spontaneous detours."',
    },
    {
        avatar: 'AL',
        name: 'Ari Levin',
        role: 'Founder and frequent flyer',
        signal: 'Time-critical travel',
        text: '"When a train delay disrupted our day, alternatives appeared instantly with trade-offs explained. It felt like having an operations editor in our pocket."',
    },
    {
        avatar: 'SM',
        name: 'Sofia Marchetti',
        role: 'Digital nomad, 14 countries',
        signal: 'Solo itinerary',
        text: '"The neighborhood sequence logic alone saved me hours of second-guessing. Every city now has a coherent internal logic that I can follow and adapt."',
    },
    {
        avatar: 'JD',
        name: 'James Devlin',
        role: 'Corporate travel manager',
        signal: 'Team offsite',
        text: '"Getting 12 people to agree on a plan used to take forever. WayMate\'s shared draft system meant we had alignment before anyone booked a single thing."',
    },
];

/* Duplicate for seamless infinite loop */
const marqueeItems = [...testimonialsData, ...testimonialsData];

const TestimonialCard = ({ avatar, name, role, signal, text }) => (
    <article className="home-testimonial-card" aria-label={`Testimonial from ${name}`}>
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
            <div className="home-author-avatar" aria-hidden="true">{avatar}</div>
            <div className="home-author-info">
                <strong>{name}</strong>
                <span>{role}</span>
            </div>
        </div>
    </article>
);

export default function Feedback() {
    return (
        <section className="home-feedback-section" aria-labelledby="home-feedback-title">
            <div className="home-feedback-shell">
                <header className="home-feedback-header">
                    <span className="home-section-kicker">Social Proof</span>
                    <h2 id="home-feedback-title">
                        Teams and travelers trust WayMate when decisions need to move fast.
                    </h2>
                    <p>
                        Field-tested feedback from users planning group escapes, focused workcations,
                        and high-constraint itineraries.
                    </p>
                </header>
            </div>

            {/* Marquee — full-width, overflows the shell */}
            <div className="home-marquee-wrap" aria-label="Customer testimonials">
                <div className="home-marquee-track">
                    {marqueeItems.map((t, i) => (
                        <TestimonialCard key={`${t.name}-${i}`} {...t} />
                    ))}
                </div>
            </div>
        </section>
    );
}
