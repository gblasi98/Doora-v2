
import React, { useState } from 'react';
import { ChevronLeft, Mail, Phone, MapPin, Calendar, FileText, Shield, Info, LogOut, Trash2, User as UserIcon, ChevronRight, Save, X, AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import { User } from '../types';

interface ProfileProps {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onUpdateUser?: (updatedUser: Partial<User>) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onBack, onLogout, onDeleteAccount, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    email: user.email,
    phone: user.phone || "+39 340 123 4567"
  });

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const validatePhone = (phone: string) => {
    // Basic regex: allows optional +, spaces, dashes, and digits. At least 9 digits.
    const clean = phone.replace(/[^0-9]/g, '');
    return clean.length >= 9 && clean.length <= 15;
  };

  const handleSave = () => {
    setErrorMsg('');
    setSuccessMsg('');

    // Validation
    if (!formData.email.trim() || !formData.phone.trim()) {
      setErrorMsg("Email e Telefono sono obbligatori.");
      return;
    }

    if (!validateEmail(formData.email)) {
      setErrorMsg("Inserisci un indirizzo email valido.");
      return;
    }

    if (!validatePhone(formData.phone)) {
      setErrorMsg("Inserisci un numero di telefono valido (min. 9 cifre).");
      return;
    }

    // Update Global State
    if (onUpdateUser) {
      onUpdateUser({
        email: formData.email,
        phone: formData.phone
      });
    }

    setSuccessMsg("Profilo aggiornato con successo!");
    setIsEditing(false);

    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        
        {/* Success/Error Banners */}
        {successMsg && (
          <div className="absolute top-4 left-4 right-4 bg-green-500 text-white p-4 rounded-2xl shadow-lg z-50 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <CheckCircle2 size={24} />
            <span className="font-bold text-sm">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-4 rounded-2xl shadow-lg z-50 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <AlertTriangle size={24} />
            <span className="font-bold text-sm">{errorMsg}</span>
          </div>
        )}

        {/* Profile Hero Section (Avatar + Stats) */}
        <section className="bg-gradient-to-b from-indigo-50 to-white p-8 pt-10 text-slate-800 rounded-b-[48px] shadow-sm relative overflow-hidden border-b border-slate-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
          
          <div className="flex flex-col items-center relative z-10">
            <div className="w-28 h-28 bg-white rounded-full border-4 border-white flex items-center justify-center shadow-xl overflow-hidden mb-4 relative group">
               <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <UserIcon size={64} />
               </div>
               {isEditing && (
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer animate-in fade-in">
                   <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                      <div className="text-[9px] font-black text-white uppercase tracking-widest">Cambia</div>
                   </div>
                 </div>
               )}
            </div>
            
            <h2 className="text-2xl font-black tracking-tight text-slate-800">{user.name} {user.surname}</h2>
            <div className="mt-2 px-4 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
              Livello {user.level}
            </div>

            <div className="flex justify-around w-full mt-8">
              <StatItem value={user.packagesDelegated.toString()} label="Pacchi" />
              <StatItem value={user.rating.toString()} label="Rating" />
              <StatItem value={user.neighborsHelped?.toString() || '0'} label="Vicini" />
            </div>
          </div>
        </section>

        {/* Informazioni Personali e Supporto */}
        <div className="p-6 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Informazioni Personali</h3>
              </div>
              <button 
                onClick={() => {
                  if(isEditing) {
                    // Reset on cancel
                    setFormData({
                      email: user.email,
                      phone: user.phone || ""
                    });
                    setErrorMsg('');
                  }
                  setIsEditing(!isEditing);
                }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm active:scale-95 transition-all ${isEditing ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white text-indigo-600 border-indigo-100'}`}
              >
                {isEditing ? 'Annulla' : 'Modifica'}
              </button>
            </div>

            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 divide-y divide-slate-50 transition-all">
              <ProfileRow 
                icon={<div className="bg-purple-100 p-2 rounded-xl text-purple-600 font-bold">@</div>} 
                label="Email" 
                value={formData.email}
                isEditing={isEditing}
                type="email"
                onChange={(val) => setFormData({...formData, email: val})}
              />
              <ProfileRow 
                icon={<div className="bg-blue-100 p-2 rounded-xl text-blue-600 text-sm">📱</div>} 
                label="Telefono" 
                value={formData.phone}
                isEditing={isEditing}
                type="tel"
                onChange={(val) => setFormData({...formData, phone: val})}
              />
              <ProfileRow 
                icon={<div className="bg-orange-100 p-2 rounded-xl text-orange-600 text-sm">🏠</div>} 
                label="Indirizzo" 
                value={user.address}
                isEditing={false} // Read Only
              />
              <ProfileRow 
                icon={<div className="bg-teal-100 p-2 rounded-xl text-teal-600 text-sm"><Layers size={14} /></div>} 
                label="Piano" 
                value={user.floor || 'N/A'}
                isEditing={false} // Read Only
              />
              <ProfileRow 
                icon={<div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 text-sm">🚪</div>} 
                label="Interno" 
                value={user.apartment}
                isEditing={false} // Read Only
              />
              <ProfileRow 
                icon={<div className="bg-slate-100 p-2 rounded-xl text-slate-600 text-sm">📅</div>} 
                label="Membro da" 
                value={user.memberSince || "N/A"} 
                isEditing={false}
              />
            </div>

            {isEditing && (
              <button 
                onClick={handleSave}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 animate-in slide-in-from-top-2 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Save size={18} />
                Salva Modifiche
              </button>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <span className="text-lg text-pink-500">❓</span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Supporto e Info</h3>
            </div>

            <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 divide-y divide-slate-50">
              <SupportRow icon={<FileText size={18} className="text-blue-400" />} title="Centro Assistenza" subtitle="FAQ e guide" />
              <SupportRow icon={<Shield size={18} className="text-amber-500" />} title="Privacy Policy" subtitle="Come trattiamo i tuoi dati" />
              <SupportRow icon={<FileText size={18} className="text-slate-400" />} title="Termini di Servizio" subtitle="Regole e condizioni d'uso" />
              <SupportRow icon={<Info size={18} className="text-sky-500" />} title="Informazioni App" subtitle="Versione 1.1.0" />
            </div>
          </section>

          <div className="space-y-3 pt-4">
            <button 
              onClick={onLogout}
              className="w-full py-4 bg-white border-2 border-amber-500 text-amber-600 rounded-3xl font-black text-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-sm hover:bg-amber-50"
            >
              <LogOut size={18} strokeWidth={3} />
              Esci dall'account
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-4 bg-white border-2 border-red-500 text-red-500 rounded-3xl font-black text-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-sm hover:bg-red-50"
            >
              <Trash2 size={18} strokeWidth={3} />
              Elimina account
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[320px] rounded-[40px] p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-100 rounded-[30px] flex items-center justify-center text-red-500 mx-auto animate-pulse">
              <AlertTriangle size={40} />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Sei sicuro?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Tutte le informazioni andranno perse definitivamente.
              </p>
            </div>
            <div className="space-y-3 pt-4">
              <button onClick={onDeleteAccount} className="w-full py-5 bg-red-500 text-white rounded-[24px] font-black text-sm shadow-xl shadow-red-100 active:scale-95 transition-all">Conferma ed Elimina</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-[24px] font-black text-sm active:scale-95 transition-all">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatItem = ({ value, label }: { value: string, label: string }) => (
  <div className="text-center">
    <div className="text-2xl font-black text-slate-800">{value}</div>
    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
  </div>
);

const ProfileRow = ({ icon, label, value, isEditing, onChange, type = "text" }: { icon: React.ReactNode, label: string, value: string, isEditing?: boolean, onChange?: (val: string) => void, type?: string }) => (
  <div className="flex items-center gap-4 p-5">
    <div className="shrink-0 flex items-center justify-center min-w-[36px]">{icon}</div>
    <div className="flex-1 min-w-0 text-left">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">{label}</span>
      {isEditing && onChange ? (
        <input 
          type={type}
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-indigo-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
          placeholder={label}
        />
      ) : (
        <span className="text-sm font-bold text-slate-700 block truncate">{value}</span>
      )}
    </div>
  </div>
);

const SupportRow = ({ icon, title, subtitle }: { icon: React.ReactNode, title: string, subtitle: string }) => (
  <button className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors group text-left">
    <div className="shrink-0 p-2 bg-slate-50 rounded-xl group-hover:bg-white transition-colors">{icon}</div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-black text-slate-800 tracking-tight">{title}</h4>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{subtitle}</p>
    </div>
    <ChevronRight size={18} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
  </button>
);

export default Profile;
