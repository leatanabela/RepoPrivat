'use client';

import { useState } from 'react';
import { ChevronDown, Monitor, FileText, Globe, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string[];
}

interface FaqCategory {
  id: string;
  label: string;
  icon: typeof Monitor;
  items: FaqItem[];
}

const faqData: FaqCategory[] = [
  {
    id: 'hardware',
    label: 'Echipamente IT',
    icon: Monitor,
    items: [
      {
        question: 'Imprimanta nu printează sau apare „Offline".',
        answer: [
          '1. Verifică dacă imprimanta este pornită și are hârtie/toner.',
          '2. Verifică dacă este conectată bine la calculator (cablul USB) sau la rețeaua Wi-Fi.',
          '3. În Windows, mergi la Start > Printers & Scanners, fă click pe imprimanta ta și asigură-te că debifezi opțiunea „Use Printer Offline" (dacă este bifată).',
          '4. Dă un simplu Restart la imprimantă (oprește-o și pornește-o după 10 secunde).',
        ],
      },
      {
        question: 'Mouse-ul sau tastatura nu răspund la comenzi.',
        answer: [
          'Dacă sunt cu fir: Scoate cablul USB și introdu-l în alt port liber de pe unitatea PC.',
          'Dacă sunt wireless (fără fir): Schimbă bateriile și verifică dacă stick-ul USB (adaptorul) este introdus corect în calculator. Uneori, oprirea și pornirea lor de la butonul de sub ele (On/Off) rezolvă problema.',
        ],
      },
      {
        question: 'Camera web nu este recunoscută în ședințe (Zoom/Teams/Meet).',
        answer: [
          'Asigură-te că aplicația pe care o folosești are permisiunea de a accesa camera. În Windows, mergi la Start > Settings > Privacy > Camera și asigură-te că opțiunea „Allow apps to access your camera" este activată.',
          'În interiorul apelului (pe Zoom/Teams), apasă pe săgeata de lângă iconița de cameră video și asigură-te că este bifată camera corectă din listă, nu una virtuală.',
        ],
      },
      {
        question: 'S-a blocat hârtia în imprimantă.',
        answer: [
          'Nu trageți de hârtie cu forță!',
          '1. Opriți imprimanta.',
          '2. Deschideți trapa principală și, dacă vedeți hârtia, trageți-o ușor cu ambele mâini în direcția în care ar fi ieșit normal.',
          '3. Verificați să nu fi rămas bucățele mici de hârtie înăuntru.',
          '4. Închideți trapa și reporniți dispozitivul.',
        ],
      },
      {
        question: 'Monitorul este negru, deși calculatorul merge.',
        answer: [
          'Verifică dacă cablul de alimentare al monitorului este bine introdus în priză și dacă cablul de date (VGA/HDMI) este bine fixat în spatele unității PC.',
          'Apasă butonul de pornire de pe marginea monitorului.',
        ],
      },
    ],
  },
  {
    id: 'office',
    label: 'Pachetul Office',
    icon: FileText,
    items: [
      {
        question: 'Cum recuperez un document Word pe care am uitat să-l salvez?',
        answer: [
          '1. Deschide un document Word gol.',
          '2. Mergi în stânga sus la meniul File (Fișier) > Info (Informații).',
          '3. Apasă pe Manage Document (Gestionare document) și alege Recover Unsaved Documents (Recuperare documente nesalvate).',
          '4. Caută fișierul tău în fereastra care se deschide, selectează-l și apasă Open.',
        ],
      },
      {
        question: 'Cum blochez rândul de sus în Excel (să rămână capul de tabel vizibil când dau scroll)?',
        answer: [
          '1. Deschide documentul Excel.',
          '2. Mergi în meniul de sus la tab-ul View (Vizualizare).',
          '3. Apasă pe Freeze Panes (Înghețare panouri) și selectează Freeze Top Row (Înghețare rând superior). Acum, primul rând va rămâne mereu vizibil pe ecran.',
        ],
      },
      {
        question: 'Cum fac rapid suma unei coloane în Excel?',
        answer: [
          'Selectează celula de sub coloana de cifre și apasă combinația de taste Alt + = (sau caută butonul AutoSum în meniul de sus).',
          'Excel va scrie automat formula de calcul pentru tine.',
        ],
      },
      {
        question: 'Outlook pare blocat și nu primesc e-mailuri noi.',
        answer: [
          'Verifică în colțul dreapta-jos al programului dacă scrie „Working Offline".',
          'Dacă da, mergi în meniul de sus la tab-ul Send/Receive și apasă pe butonul Work Offline pentru a-l dezactiva și a reveni la conexiunea normală.',
        ],
      },
    ],
  },
  {
    id: 'browser',
    label: 'Browser (Chrome)',
    icon: Globe,
    items: [
      {
        question: 'O pagină de internet dă eroare sau nu se încarcă corect. Cum șterg Cache-ul?',
        answer: [
          '1. Deschide Google Chrome și apasă pe tastatură combinația: Ctrl + Shift + Delete.',
          '2. Se va deschide o fereastră nouă. La „Time range" (Interval de timp), selectează All time (Dintotdeauna).',
          '3. Bifează opțiunile Cookies and other site data și Cached images and files.',
          '4. Apasă butonul albastru Clear data (Ștergeți datele) și dă un refresh paginii care nu mergea.',
        ],
      },
    ],
  },
  {
    id: 'windows',
    label: 'Windows',
    icon: Laptop,
    items: [
      {
        question: 'Calculatorul s-a blocat complet (a „înghețat") și nu mai pot da click pe nimic.',
        answer: [
          '1. Nu trage imediat PC-ul din priză! Apasă pe tastatură combinația Ctrl + Shift + Esc pentru a deschide Task Manager. Dacă se deschide, dă click dreapta pe programul care a cauzat blocajul și alege End Task (Închidere activitate).',
          '2. Dacă nu merge pasul 1, apasă Ctrl + Alt + Delete și alege opțiunea de Restart din colțul dreapta jos.',
          '3. Dacă PC-ul nu reacționează la absolut nicio comandă, ține apăsat lung (aprox. 5-10 secunde) pe butonul fizic de pornire (Power) al unității PC/laptopului, până când acesta se oprește complet. Pornește-l din nou normal.',
        ],
      },
      {
        question: 'Nu găsesc un fișier, deși știu că l-am salvat.',
        answer: [
          'Apasă tasta Windows și începe să scrii direct numele fișierului sau o parte din el. Windows va căuta automat în tot calculatorul.',
          'Dacă nu apare, verifică folderul Downloads (Descărcări), unde ajung majoritatea fișierelor descărcate de pe internet sau e-mail.',
        ],
      },
    ],
  },
];

export default function FaqPage() {
  const [activeTab, setActiveTab] = useState(faqData[0].id);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  function toggleItem(key: string) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const activeCategory = faqData.find((c) => c.id === activeTab)!;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 lg:p-10 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-primary">
            Întrebări Frecvente
          </h1>
          <p className="text-slate-500 dark:text-dm-on-surface-variant mt-1">
            Soluții rapide la cele mai comune probleme tehnice
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {faqData.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-180',
                activeTab === cat.id
                  ? 'bg-primary text-white dark:bg-dm-primary-container dark:text-white shadow-sm'
                  : 'bg-white dark:bg-dm-surface-high/30 text-slate-600 dark:text-dm-on-surface-variant border border-slate-200/80 dark:border-dm-surface-bright/15 hover:bg-slate-50 dark:hover:bg-dm-surface-high'
              )}
            >
              <cat.icon size={16} />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Accordion */}
        <div className="bg-white dark:bg-dm-surface-high/30 rounded-2xl border border-slate-200/80 dark:border-dm-surface-bright/15 overflow-hidden">
          {activeCategory.items.map((item, idx) => {
            const key = `${activeTab}-${idx}`;
            const isOpen = openItems.has(key);
            return (
              <div
                key={key}
                className="border-b border-slate-100 dark:border-dm-surface-high/50 last:border-b-0"
              >
                <button
                  onClick={() => toggleItem(key)}
                  className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-dm-surface-high transition-colors duration-180"
                >
                  <div className="size-9 rounded-lg bg-primary/10 dark:bg-dm-primary/10 flex items-center justify-center shrink-0">
                    <activeCategory.icon size={16} className="text-primary dark:text-dm-primary" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-dm-on-surface flex-1">
                    {item.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      'text-slate-400 dark:text-dm-on-surface-variant shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                  />
                </button>

                <div
                  className={cn(
                    'grid transition-all duration-200',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-5 pt-1 ml-12">
                      <div className="space-y-2.5">
                        {item.answer.map((line, i) => (
                          <p
                            key={i}
                            className="text-sm text-slate-600 dark:text-dm-on-surface-variant leading-relaxed"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
