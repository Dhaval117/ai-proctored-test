import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Title1, Text, Input, Button, Spinner } from '@fluentui/react-components';
import { Person24Regular, Password24Regular } from '@fluentui/react-icons';
import { useAuth } from '../context/AuthContext';
import { useCommonStyles } from './styles/common.styles';

export default function AdminLoginPage() {
    const commonStyles = useCommonStyles();
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch('http://localhost:8000/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (!res.ok) {
                throw new Error('Invalid email or password');
            }

            const data = await res.json();
            login(data.access_token);
            navigate('/admin');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`${commonStyles.pageContainer} flex items-center justify-center animate-fade-in`}>
            <Card className="w-full max-w-md p-8 flex flex-col gap-6 shadow-xl">
                <Title1>Admin Login</Title1>
                <div>
                    <Text className="block mt-2 text-neutral-500">Sign in to manage candidates and exams</Text>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div>
                        <Input
                            type="email"
                            placeholder="Email address"
                            size="large"
                            contentBefore={<Person24Regular />}
                            value={email}
                            onChange={(e, data) => setEmail(data.value)}
                            required
                            className={commonStyles.wFull}
                        />
                    </div>
                    <div>
                        <Input
                            type="password"
                            placeholder="Password"
                            size="large"
                            contentBefore={<Password24Regular />}
                            value={password}
                            onChange={(e, data) => setPassword(data.value)}
                            required
                            className={commonStyles.wFull}
                        />
                    </div>

                    {error && (
                        <Text className="text-red-500 text-sm font-medium">{error}</Text>
                    )}

                    <Button type="submit" appearance="primary" size="large" disabled={loading}>
                        {loading ? <Spinner size="tiny" /> : "Sign In"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
