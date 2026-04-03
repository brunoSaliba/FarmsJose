import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, LogOut, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function ConfiguracaoPage() {
  const { t } = useTranslation();
  const { user, updateMe, logout } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState(user?.nome ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  function clearMessages() {
    setSuccessMsg('');
    setErrorMsg('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg(t('configuracao.messages.newPasswordsMismatch'));
      return;
    }

    const payload: Record<string, string> = {};

    if (nome !== user?.nome) payload.nome = nome;
    if (email !== user?.email) {
      payload.email = email;
      payload.current_password = currentPassword;
    }
    if (newPassword) {
      payload.password = newPassword;
      payload.current_password = currentPassword;
    }

    if (Object.keys(payload).length === 0) {
      setErrorMsg(t('configuracao.messages.noChanges'));
      return;
    }

    setLoading(true);
    try {
      await updateMe(payload);
      setSuccessMsg(t('configuracao.messages.updated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        t('configuracao.messages.saveError');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('configuracao.title')}</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow divide-y">
        <div className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <User size={15} /> {t('configuracao.sections.personalData')}
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.fields.name')}</label>
            <input
              type="text"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1"><Mail size={13} /> {t('common.fields.email')}</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {email !== user?.email && (
              <p className="text-xs text-amber-600 mt-1">{t('configuracao.messages.emailChangeHint')}</p>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Lock size={15} /> {t('configuracao.sections.changePassword')}
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.fields.currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder={t('configuracao.messages.currentPasswordHint')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.fields.newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t('configuracao.messages.newPasswordHint')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.fields.confirmNewPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t('configuracao.messages.confirmPasswordHint')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="p-6 space-y-3">
          {successMsg && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {errorMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 bg-primary-700 text-white rounded-md font-medium hover:bg-primary-800 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            {loading ? `${t('common.actions.save')}...` : t('common.actions.saveChanges')}
          </button>
        </div>
      </form>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-4">
          <LogOut size={15} /> {t('configuracao.sections.session')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t('configuracao.messages.connectedAs')} <strong>{user?.email}</strong>
          {user?.is_admin && <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{t('common.admin')}</span>}
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
        >
          <LogOut size={15} />
          {t('common.actions.logout')}
        </button>
      </div>
    </div>
  );
}
