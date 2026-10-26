import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Members-only details — birthday, city, what they're doing now, email — live in
// classes/{classId}/details/{uid}. Firestore rules let only signed-in class members read them,
// unlike the public profile in classes/{classId}/members/{uid}.

export const detailsRef = (classId, uid) => doc(db, 'classes', classId, 'details', uid);

export async function fetchDetails(classId, uid) {
  const snap = await getDoc(detailsRef(classId, uid));
  return snap.exists() ? snap.data() : null;
}

// All members' details as { [uid]: details }
export async function fetchAllDetails(classId) {
  const snap = await getDocs(collection(db, 'classes', classId, 'details'));
  return Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
}

export function saveDetails(classId, uid, data) {
  return setDoc(detailsRef(classId, uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/* ── Birthdays: stored as "MM-DD", no year ── */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isValidBirthday(month, day) {
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
}

export function toBirthday(month, day) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseBirthday(mmdd) {
  const m = /^(\d{2})-(\d{2})$/.exec(mmdd || '');
  return m ? { month: Number(m[1]), day: Number(m[2]) } : null;
}

export function formatBirthday(mmdd) {
  const b = parseBirthday(mmdd);
  return b ? `${b.day} ${MONTHS[b.month - 1]}` : '';
}

// 0 = today; 29 Feb falls on 1 March in non-leap years
export function daysUntilBirthday(mmdd, today) {
  const b = parseBirthday(mmdd);
  if (!b) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(start.getFullYear(), b.month - 1, b.day);
  if (next < start) next = new Date(start.getFullYear() + 1, b.month - 1, b.day);
  return Math.round((next - start) / 86400000);
}

// Birthdays today, and the next few within `withinDays`
export function birthdaysAround(members, details, today, withinDays = 30) {
  const people = members
    .filter(m => details[m.id]?.birthday)
    .map(m => ({ ...m, birthday: details[m.id].birthday, days: daysUntilBirthday(details[m.id].birthday, today) }))
    .filter(p => p.days !== null);
  return {
    today: people.filter(p => p.days === 0),
    upcoming: people.filter(p => p.days > 0 && p.days <= withinDays).sort((a, b) => a.days - b.days).slice(0, 6),
  };
}

/* ── Cities: group the same place written different ways ── */

const CITY_ALIASES = {
  bangalore: 'Bengaluru', bengaluru: 'Bengaluru',
  bombay: 'Mumbai', mumbai: 'Mumbai',
  madras: 'Chennai', chennai: 'Chennai',
  calcutta: 'Kolkata', kolkata: 'Kolkata',
  cochin: 'Kochi', kochi: 'Kochi',
  trivandrum: 'Thiruvananthapuram', thiruvananthapuram: 'Thiruvananthapuram',
  calicut: 'Kozhikode', kozhikode: 'Kozhikode',
  trichur: 'Thrissur', thrissur: 'Thrissur',
  gurgaon: 'Gurugram', gurugram: 'Gurugram',
};

export function cityLabel(city) {
  const trimmed = (city || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const key = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  return CITY_ALIASES[key] || trimmed.replace(/\b\w/g, c => c.toUpperCase());
}
