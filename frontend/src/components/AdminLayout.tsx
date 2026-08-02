import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@fluentui/react-components';
import { SignOut24Regular, Board24Regular } from '@fluentui/react-icons';

export default function AdminLayout() {
    const { token, logout } = useAuth();

    if (!token) {
        return <Navigate to="/admin/login" replace />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-900">
            {/* Admin Header Navbar */}
            <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 h-16 flex items-center justify-between px-6 shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="flex items-center gap-2 no-underline text-neutral-900 dark:text-neutral-50 font-semibold text-lg hover:text-brand-500 transition-colors">
                        <Board24Regular className="text-brand-500" />
                        Admin Dashboard
                    </Link>
                </div>
                <div>
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
