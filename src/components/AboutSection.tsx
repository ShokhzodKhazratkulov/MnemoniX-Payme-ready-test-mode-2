
import React from 'react';
import { Search, Sparkles, Brain } from 'lucide-react';

interface AboutSectionProps {
  t: any;
}

const AboutSection: React.FC<AboutSectionProps> = ({ t }) => {
  return (
    <div className="mt-16 sm:mt-24 space-y-16 animate-fadeIn">
      <div className="text-center space-y-4">
        <h3 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
          {t.howItWorksTitle}
        </h3>
        <div className="w-24 h-1.5 bg-accent mx-auto rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {/* Step 1 */}
        <div className="group bg-white/90 dark:bg-primary/60 backdrop-blur-lg border border-gray-100 dark:border-white/10 rounded-[2.5rem] shadow-xl shadow-accent/5 p-10 flex flex-col items-center text-center hover:-translate-y-2 transition-all duration-500">
          <div className="w-16 h-16 bg-accent/10 dark:bg-accent/10 rounded-2xl flex items-center justify-center text-accent dark:text-accent mb-8 group-hover:scale-110 transition-transform">
            <Search size={32} strokeWidth={2.5} />
          </div>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{t.howItWorksStep1}</h4>
          <p className="text-slate-600 dark:text-gray-400 font-medium leading-relaxed">
            {t.howItWorksStep1Desc}
          </p>
        </div>

        {/* Step 2 */}
        <div className="group bg-white/90 dark:bg-primary/60 backdrop-blur-lg border border-gray-100 dark:border-white/10 rounded-[2.5rem] shadow-xl shadow-accent/5 p-10 flex flex-col items-center text-center hover:-translate-y-2 transition-all duration-500">
          <div className="w-16 h-16 bg-amber-500/10 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-8 group-hover:scale-110 transition-transform">
            <Sparkles size={32} strokeWidth={2.5} />
          </div>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{t.howItWorksStep2}</h4>
          <p className="text-slate-600 dark:text-gray-400 font-medium leading-relaxed">
            {t.howItWorksStep2Desc}
          </p>
        </div>

        {/* Step 3 */}
        <div className="group bg-white/90 dark:bg-primary/60 backdrop-blur-lg border border-gray-100 dark:border-white/10 rounded-[2.5rem] shadow-xl shadow-accent/5 p-10 flex flex-col items-center text-center hover:-translate-y-2 transition-all duration-500">
          <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-8 group-hover:scale-110 transition-transform">
            <Brain size={32} strokeWidth={2.5} />
          </div>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{t.howItWorksStep3}</h4>
          <p className="text-slate-600 dark:text-gray-400 font-medium leading-relaxed">
            {t.howItWorksStep3Desc}
          </p>
        </div>
      </div>

      {/* Science Note */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-accent rounded-[2.5rem] p-10 sm:p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles size={40} />
            </div>
            <div className="text-center sm:text-left space-y-4">
              <h5 className="text-3xl font-black tracking-tight">{t.aboutMethodTitle}</h5>
              <p className="text-neutral text-xl font-medium leading-relaxed">
                {t.aboutMethodDesc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSection;
