import './Globe.css';

export default function Globe() {
    const highlights = [
        '150+ regional mobility patterns mapped',
        'Rail, metro, rideshare, and walking flows combined',
        'Local pacing presets for relaxed or high-output trips',
    ];

    return (
        <section className="home-globe-section" aria-labelledby="home-globe-title">
            <div className="home-globe-shell">
                <div className="home-globe-copy">
                    <span className="home-globe-kicker">Coverage Studio</span>
                    <h2 id="home-globe-title">One planning language across cities, terminals, and borders.</h2>
                    <p>
                        Build plans that respect real transit behavior and local rhythm. WayMate helps your itinerary
                        stay elegant whether you are crossing neighborhoods or countries.
                    </p>

                    <ul className="home-globe-list">
                        {highlights.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>

                    <p className="home-globe-footnote">
                        Coverage intelligence is continuously tuned so route logic stays practical for solo travelers,
                        families, and mixed-group journeys.
                    </p>
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
