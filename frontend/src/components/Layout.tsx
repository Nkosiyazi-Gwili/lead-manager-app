'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Leads', href: '/leads', icon: '👥' },
    { name: 'Import', href: '/import', icon: '📥' },
    { name: 'Reports', href: '/reports', icon: '📈' },
    { name: 'Users', href: '/users', icon: '👤' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300`}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            {isSidebarOpen && (
              <h1 className="text-xl font-bold text-gray-800">Lead Manager</h1>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {isSidebarOpen ? '←' : '→'}
            </button>
          </div>
        </div>

        <nav className="mt-8">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              {isSidebarOpen && (
                <span className="ml-3 font-medium">{item.name}</span>
              )}
            </a>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Welcome back, {user?.name}
              </h2>
              <p className="text-sm text-gray-600">{user?.role} • {user?.department}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100">
                <span className="text-lg">🔔</span>
              </button>
              <div className="relative">
                <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.name?.charAt(0)}
                  </div>
                  {isSidebarOpen && (
                    <span className="text-sm font-medium text-gray-700">
                      {user?.name}
                    </span>
                  )}
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}