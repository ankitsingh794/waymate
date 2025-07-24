import { motion, AnimatePresence } from "framer-motion";
import './Cards.css';
import Lottie from 'lottie-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Import all Lottie animations
import aiService from '../../assets/ai-service.json';
import aiDecision from '../../assets/ai-decision.json';
import voice from '../../assets/voice-command.json';
import calendar from '../../assets/calendar.json';
import clock from '../../assets/clock.json';
import weather from '../../assets/rain-cloud.json';
import sun from '../../assets/sunrise.json';
import thunder from '../../assets/cloud-with-lightning.json';
import map from '../../assets/map.json';
import globe from '../../assets/globe.json';
import alerts from '../../assets/warning.json';
import newspaper from '../../assets/newspaper.json';
import tornado from '../../assets/tornado.json';
import budget from '../../assets/wallet.json';
import money from '../../assets/money-with-wings.json';
import groupTravel from '../../assets/group.json';
import chat from '../../assets/chat.json';

export default function Cards() {
    const { t } = useTranslation('home');

    const animations = [
        [aiService, aiDecision, voice],
        [calendar, clock],
        [weather, sun, thunder],
        [map, globe],
        [alerts, newspaper, tornado],
        [budget, money],
        [groupTravel, chat]
    ];

    // Dynamically get card content from translation file
    const cardContent = t('features.cards', { returnObjects: true }) || [];

    const [currentIndexes, setCurrentIndexes] = useState(Array(animations.length).fill(0));

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndexes(prevIndexes =>
                prevIndexes.map((_, i) => (prevIndexes[i] + 1) % animations[i].length)
            );
        }, 5000);
        return () => clearInterval(interval);
    }, [animations]);

    return (
        <div className="cards-container">
            <div className="title">{t('features.title')}</div>
            <div className="cards">
                {cardContent.map((content, i) => (
                    <div className="card" key={i}>
                        <div className="lottie-wrapper">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentIndexes[i]}
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -100, opacity: 0 }}
                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                    className="lottie-slide"
                                >
                                    <Lottie animationData={animations[i][currentIndexes[i]]} loop={true} className="card-lottie" />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        <h3>{content.title}</h3>
                        <p>{content.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
