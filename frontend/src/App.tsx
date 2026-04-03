import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import FazendasPage from './pages/FazendasPage';
import FazendaFormPage from './pages/FazendaFormPage';
import AnimaisPage from './pages/AnimaisPage';
import AnimalFormPage from './pages/AnimalFormPage';
import ResumoPage from './pages/ResumoPage';
import LoginPage from './pages/LoginPage';
import ConfiguracaoPage from './pages/ConfiguracaoPage';
import DashboardFabricaPage from './pages/fabrica/DashboardFabricaPage';
import ClientesPage from './pages/fabrica/ClientesPage';
import ClienteFormPage from './pages/fabrica/ClienteFormPage';
import PedidosPage from './pages/fabrica/PedidosPage';
import PedidoFormPage from './pages/fabrica/PedidoFormPage';
import PedidoDetailPage from './pages/fabrica/PedidoDetailPage';
import PedidoEditPage from './pages/fabrica/PedidoEditPage';
import EmailConsolidadoPage from './pages/fabrica/EmailConsolidadoPage';
import ConfiguracoesAdminPage from './pages/fabrica/ConfiguracoesAdminPage';
import ProdutosPage from './pages/fabrica/ProdutosPage';
import ProdutoFormPage from './pages/fabrica/ProdutoFormPage';
import FabricasPage from './pages/fabrica/FabricasPage';
import FabricaFormPage from './pages/fabrica/FabricaFormPage';
import { FabricaUsuariosPage } from './pages/fabrica/FabricaUsuariosPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import UsuariosPage from './pages/admin/UsuariosPage';
import UsuarioFormPage from './pages/admin/UsuarioFormPage';
import QueryRunnerPage from './pages/admin/QueryRunnerPage';
import { useAuth } from './hooks/useAuth';
import { useFabrica } from './hooks/useFabrica';
import { useTranslation } from 'react-i18next';

function ProtectedRoute({ children, module }: { children: React.ReactNode; module?: string }) {
  const { t } = useTranslation();
  const { user, loading, hasModule } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (module && !hasModule(module)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function FabricaRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, loading, hasModule } = useAuth();
  const { activeFabrica, isLoading: fabricaLoading, fabricas } = useFabrica();
  if (loading || fabricaLoading) return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasModule('fabrica')) return <Navigate to="/" replace />;
  if (!fabricaLoading && fabricas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-600">
        <p className="text-lg font-medium">{t('app.noFactoryFoundTitle')}</p>
        <p className="text-sm">{t('app.noFactoryFoundDescription')}</p>
        <a href="/fabrica/unidades/novo" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">
          {t('app.registerFactory')}
        </a>
      </div>
    );
  }
  if (!activeFabrica) return null;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user, hasModule } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (hasModule('animais')) return <HomePage />;
  if (hasModule('fabrica')) return <Navigate to="/fabrica" replace />;
  if (user.is_admin) return <Navigate to="/admin" replace />;
  return <HomePage />;
}

function LoginRedirect() {
  const { user, hasModule } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (hasModule('animais')) return <Navigate to="/" replace />;
  if (hasModule('fabrica')) return <Navigate to="/fabrica" replace />;
  if (user.is_admin) return <Navigate to="/admin" replace />;
  return <Navigate to="/" replace />;
}

export default function App() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <LoginRedirect /> : <LoginPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/fazendas" element={<ProtectedRoute module="animais"><FazendasPage /></ProtectedRoute>} />
        <Route path="/fazendas/novo" element={<ProtectedRoute module="animais"><FazendaFormPage /></ProtectedRoute>} />
        <Route path="/fazendas/:id/editar" element={<ProtectedRoute module="animais"><FazendaFormPage /></ProtectedRoute>} />
        <Route path="/animais" element={<ProtectedRoute module="animais"><AnimaisPage /></ProtectedRoute>} />
        <Route path="/animais/novo" element={<ProtectedRoute module="animais"><AnimalFormPage /></ProtectedRoute>} />
        <Route path="/animais/:id/editar" element={<ProtectedRoute module="animais"><AnimalFormPage /></ProtectedRoute>} />
        <Route path="/resumo" element={<ProtectedRoute module="animais"><ResumoPage /></ProtectedRoute>} />
        <Route path="/configuracao" element={<ConfiguracaoPage />} />
        {/* Modulo 2 — Fabrica */}
        <Route path="/fabrica" element={<FabricaRoute><DashboardFabricaPage /></FabricaRoute>} />
        <Route path="/fabrica/clientes" element={<FabricaRoute><ClientesPage /></FabricaRoute>} />
        <Route path="/fabrica/clientes/novo" element={<FabricaRoute><ClienteFormPage /></FabricaRoute>} />
        <Route path="/fabrica/clientes/:id/editar" element={<FabricaRoute><ClienteFormPage /></FabricaRoute>} />
        <Route path="/fabrica/produtos" element={<FabricaRoute><ProdutosPage /></FabricaRoute>} />
        <Route path="/fabrica/produtos/novo" element={<FabricaRoute><ProdutoFormPage /></FabricaRoute>} />
        <Route path="/fabrica/produtos/:id/editar" element={<FabricaRoute><ProdutoFormPage /></FabricaRoute>} />
        <Route path="/fabrica/unidades" element={<ProtectedRoute module="fabrica"><FabricasPage /></ProtectedRoute>} />
        <Route path="/fabrica/unidades/novo" element={<ProtectedRoute module="fabrica"><FabricaFormPage /></ProtectedRoute>} />
        <Route path="/fabrica/unidades/:id/editar" element={<ProtectedRoute module="fabrica"><FabricaFormPage /></ProtectedRoute>} />
        <Route path="/fabrica/pedidos" element={<FabricaRoute><PedidosPage /></FabricaRoute>} />
        <Route path="/fabrica/pedidos/novo" element={<FabricaRoute><PedidoFormPage /></FabricaRoute>} />
        <Route path="/fabrica/pedidos/:id" element={<FabricaRoute><PedidoDetailPage /></FabricaRoute>} />
        <Route path="/fabrica/pedidos/:id/editar" element={<FabricaRoute><PedidoEditPage /></FabricaRoute>} />
        <Route path="/fabrica/email" element={<FabricaRoute><EmailConsolidadoPage /></FabricaRoute>} />
        <Route path="/fabrica/usuarios" element={<FabricaRoute><FabricaUsuariosPage /></FabricaRoute>} />
        <Route path="/fabrica/configuracoes" element={<FabricaRoute><ConfiguracoesAdminPage /></FabricaRoute>} />
        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/admin/usuarios" element={<AdminRoute><UsuariosPage /></AdminRoute>} />
        <Route path="/admin/usuarios/novo" element={<AdminRoute><UsuarioFormPage /></AdminRoute>} />
        <Route path="/admin/usuarios/:id/editar" element={<AdminRoute><UsuarioFormPage /></AdminRoute>} />
        <Route path="/admin/query" element={<AdminRoute><QueryRunnerPage /></AdminRoute>} />
      </Route>
    </Routes>
  );
}
