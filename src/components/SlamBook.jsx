import { SLAMBOOK_PROMPTS } from '../utils/slambook';
import './SlamBook.css';

// A member's slam-book answers, in their own "handwriting". Unanswered prompts are skipped.
export default function SlamBook({ answers }) {
  const filled = SLAMBOOK_PROMPTS.filter(p => answers?.[p.key]?.trim());
  if (filled.length === 0) return null;

  return (
    <dl className="slambook">
      {filled.map(p => (
        <div key={p.key} className="slambook__entry">
          <dt className="slambook__prompt">{p.label}</dt>
          <dd className="hand slambook__answer">{answers[p.key]}</dd>
        </div>
      ))}
    </dl>
  );
}
