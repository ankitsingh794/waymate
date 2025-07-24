import { useTranslation } from 'react-i18next';
import './Feedback.css';

export default function Feedback() {
    const { t } = useTranslation('home');

    const testimonials = t('testimonials.items', { returnObjects: true }) || [];

    return (
      <div className="feedback-container">
        <div className="title">{t('testimonials.title')}</div>
        <div className="feedback-cards">
          {testimonials.map((item, index) => (
            <div className="feedback-card" key={index}>
              <p>"{item.quote}"</p>
              <h4>- {item.author}</h4>
            </div>
          ))}
        </div>
      </div>
    );
}
