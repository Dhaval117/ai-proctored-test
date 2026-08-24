import React, { useState } from 'react';
import { 
  Card, 
  Title1, 
  Text, 
  Button, 
  Input,
  Label
} from '@fluentui/react-components';
import { api } from '../lib/api';
import { useAdminStyles } from './styles/AdminPage.styles';
import { useCommonStyles } from './styles/common.styles';

export default function AdminSettingsPage() {
  const styles = useAdminStyles();
  const commonStyles = useCommonStyles();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    setLoading(true);
    try {
      await api.updatePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${commonStyles.pageContainer} animate-fade-in`}>
      <div className="flex flex-col w-full max-w-[600px] gap-6 mt-12">
        <div>
          <Title1 className={styles.headerTitle}>Account Settings</Title1>
          <Text className={styles.headerSubtitle}>
            Update your account password
          </Text>
        </div>

        <Card className={`${commonStyles.mainCard} !max-w-none`}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <Text className="text-red-600">{error}</Text>}
            {success && <Text className="text-green-600">Password updated successfully!</Text>}
            
            <div className="flex flex-col gap-1">
              <Label required htmlFor="currentPassword">Current Password</Label>
              <Input 
                id="currentPassword"
                type="password" 
                required 
                value={currentPassword} 
                onChange={(e, data) => setCurrentPassword(data.value)} 
                className={commonStyles.wFull}
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <Label required htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword"
                type="password" 
                required 
                value={newPassword} 
                onChange={(e, data) => setNewPassword(data.value)} 
                className={commonStyles.wFull}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label required htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword"
                type="password" 
                required 
                value={confirmPassword} 
                onChange={(e, data) => setConfirmPassword(data.value)} 
                className={commonStyles.wFull}
              />
            </div>

            <Button type="submit" appearance="primary" disabled={loading} className="mt-4">
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
