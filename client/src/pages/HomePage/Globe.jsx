import './Globe.css';

export default function Globe() {
    const highlights = [
        '150+ destination-ready countries',
        'Smart routing for mixed transport',
        'Live adjustments while traveling',
    ];

    return (
        <section className="home-globe-section">
            <div className="home-globe-shell">
                <div className="home-globe-copy">
                    <span className="home-globe-kicker">Global coverage</span>
                    <h2>Explore the world with confidence.</h2>
                    <p>
                        Discover where to go, when to move, and how to organize each day with a planner designed for
                        real-world travel variability.
                    </p>

                    <ul className="home-globe-list">
                        {highlights.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="home-globe-visual" aria-hidden="true">
                    <div className="home-globe-aura" />
                    <div className="home-globe-sphere">
                        <span className="home-globe-ring home-globe-ring-one" />
                        <span className="home-globe-ring home-globe-ring-two" />
                        <span className="home-globe-pin home-globe-pin-one" />
                        <span className="home-globe-pin home-globe-pin-two" />
                        <span className="home-globe-pin home-globe-pin-three" />
                    </div>
                </div>
            </div>
        </section>
    );
}
