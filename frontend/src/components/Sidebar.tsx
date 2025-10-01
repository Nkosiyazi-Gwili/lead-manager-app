'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = {
  admin: [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Leads', href: '/leads', icon: '📋' },
    { name: 'Users', href: '/users', icon: '👥' },
    { name: 'Reports', href: '/reports', icon: '📈' },
    { name: 'Import', href: '/import', icon: '📥' },
  ],
  sales_manager: [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Leads', href: '/leads', icon: '📋' },
    { name: 'Team Leads', href: '/team-leads', icon: '👥' },
    { name: 'Reports', href: '/reports', icon: '📈' },
    { name: 'Import', href: '/import', icon: '📥' },
  ],
  sales_agent: [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'My Leads', href: '/leads', icon: '📋' },
  ],
  marketing_manager: [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Leads', href: '/leads', icon: '📋' },
    { name: 'Import', href: '/import', icon: '📥' },
    { name: 'Reports', href: '/reports', icon: '📈' },
  ],
  marketing_agent: [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Leads', href: '/leads', icon: '📋' },
  ],
  other: [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  ]
};

export default function Sidebar({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const userNavigation = navigation[user?.role as keyof typeof navigation] || navigation.other;

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${open ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setOpen(false)} />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-xl font-bold text-gray-800">Leads Manager</h1>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {userNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <span className="mr-4 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-gray-800">Leads Manager</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                {userNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      pathname === item.href
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}