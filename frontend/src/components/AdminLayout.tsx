import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Spinner } from '@fluentui/react-components';
import { SignOut24Regular, Board24Regular } from '@fluentui/react-icons';
import { api } from '../lib/api';
import type { AdminUserResponse } from '../lib/api';

export default function AdminLayout() {
    const { token, logout } = useAuth();
    const location = useLocation();
    const [user, setUser] = useState<AdminUserResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            api.getMe().then(res => {
                setUser(res);
                setLoading(false);
            }).catch(err => {
                console.error("Failed to fetch user:", err);
                logout();
            });
        } else {
            setLoading(false);
        }
    }, [token, logout]);

    if (!token) {
        return <Navigate to="/admin/login" replace />;
    }

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Spinner size="large" /></div>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-900">
            {/* Admin Header Navbar */}
            <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 h-16 flex items-center justify-between px-6 shrink-0 shadow-sm">
                <div className="flex items-center gap-6">
                    <Link to="/admin" className="flex items-center gap-2 no-underline text-neutral-900 dark:text-neutral-50 font-semibold text-lg hover:text-brand-500 transition-colors">
                        <Board24Regular className="text-brand-500" />
                        Admin Dashboard
                    </Link>
                    
                    <nav className="hidden md:flex gap-4 ml-4">
                        <Link 
                            to="/admin" 
                            className={`no-underline font-medium hover:text-brand-500 transition-colors ${location.pathname === '/admin' ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-600 dark:text-neutral-300'}`}
                        >
                            Sessions
                        </Link>
                        {user?.is_superadmin && (
                            <Link 
                                to="/admin/managers" 
                                className={`no-underline font-medium hover:text-brand-500 transition-colors ${location.pathname.startsWith('/admin/managers') ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-600 dark:text-neutral-300'}`}
                            >
                                Manage Admins
                            </Link>
                        )}
                        <Link 
                            to="/admin/settings" 
                            className={`no-underline font-medium hover:text-brand-500 transition-colors ${location.pathname.startsWith('/admin/settings') ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-600 dark:text-neutral-300'}`}
                        >
                            Settings
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 hidden sm:inline-block">
                        {user?.email} {user?.is_superadmin ? '(Super Admin)' : ''}
                    </span>
                    <Button 
                        appearance="subtle" 
                        icon={<SignOut24Regular />} 
                        onClick={logout}
                        title="Sign Out"
                    >
                        Sign Out
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}

