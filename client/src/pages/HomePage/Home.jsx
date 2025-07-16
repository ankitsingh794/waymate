import Bgimg from '../../assets/hero-image.png';
import './Home.css';
import Navbare from '../../components/navbar.jsx';

export default function Home() {
    return (
        <div className="home">
            <div className='img-wrapper'>
                <Navbare />
                <div className='img-overlay'>
                    Plan your hassle-free trip with WayMate
                    <a href="/login" className='cta-button'>Get Started</a>
                    <a href="/login" className='cta-button'>Explore</a>
                </div>
                <img src={Bgimg} alt="Background" className="home-bg" />
            </div>
        </div>
    );
}