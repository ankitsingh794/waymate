import { useTranslation } from 'react-i18next';
import './Home.css';
import Navbar from '../../components/navbar.jsx';
import Cards from './Cards.jsx';
import Feedback from './Feedback.jsx';
import Globe from './Globe.jsx'; 

export default function Home() {
    const { t } = useTranslation('home');

    return (
        <div className="home">
            <Navbar />
            <div className='img-wrapper'>
                <div className='img-overlay'>
                    {t('hero.title')}
                    <div className='buttons'>
                        <a href="/login" className='cta-button'>{t('hero.getStarted')}</a>
                        <a href="/login" className='cta-button'>{t('hero.explore')}</a>
                    </div>
                </div>
                <Globe />
            </div>

            <Cards />
            <Feedback />
        </div>
    );
}
