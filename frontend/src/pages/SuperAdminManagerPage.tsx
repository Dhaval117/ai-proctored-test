import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Title1, 
  Text, 
  Button, 
  Table, 
  TableHeader, 
  TableRow, 
  TableHeaderCell, 
  TableBody, 
  TableCell, 
  Spinner,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Input,
  Checkbox,
  Badge
} from '@fluentui/react-components';
import { Delete20Regular, PersonAdd20Regular } from '@fluentui/react-icons';
import { api } from '../lib/api';
import type { AdminUserResponse } from '../lib/api';
import { useAdminStyles } from './styles/AdminPage.styles';
import { useCommonStyles } from './styles/common.styles';

export default function SuperAdminManagerPage() {
  const styles = useAdminStyles();
  const commonStyles = useCommonStyles();
  const [admins, setAdmins] = useState<AdminUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getManagers();
      setAdmins(res.admins);
    } catch (err: any) {
      setError(err.message || "Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      await api.createManager({ email, password, is_superadmin: isSuperadmin });
      setIsDialogOpen(false);
      setEmail('');
      setPassword('');
      setIsSuperadmin(false);
      fetchAdmins();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create admin");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!window.confirm("Are you sure you want to delete this admin?")) return;
    try {
      await api.deleteManager(adminId);
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || "Failed to delete admin");
    }
  };

  return (
    <div className={`${commonStyles.pageContainer} animate-fade-in`}>
      <div className={styles.mainWrapper}>
        <div className={styles.headerRow}>
          <div>
            <Title1 className={styles.headerTitle}>Manage Admins</Title1>
            <Text className={styles.headerSubtitle}>
              Create and manage admin accounts for the platform
            </Text>
          </div>
          <div>
            <Dialog open={isDialogOpen} onOpenChange={(e, data) => setIsDialogOpen(data.open)}>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="primary" icon={<PersonAdd20Regular />}>Add Admin</Button>
              </DialogTrigger>
              <DialogSurface>
                <form onSubmit={handleCreate}>
                  <DialogBody>
                    <DialogTitle>Create New Admin</DialogTitle>
                    <DialogContent className="flex flex-col gap-4 mt-4">
                      {createError && <Text className="text-red-600">{createError}</Text>}
                      <div>
                        <Text weight="semibold">Email</Text>
                        <Input 
                          type="email" 
                          required 
                          value={email} 
                          onChange={(e, data) => setEmail(data.value)} 
                          className={commonStyles.wFull}
                        />
                      </div>
                      <div>
                        <Text weight="semibold">Password</Text>
                        <Input 
                          type="password" 
                          required 
                          value={password} 
                          onChange={(e, data) => setPassword(data.value)} 
                          className={commonStyles.wFull}
                        />
                      </div>
                      <div>
                        <Checkbox 
                          label="Super Admin" 
                          checked={isSuperadmin} 
                          onChange={(e, data) => setIsSuperadmin(!!data.checked)} 
                        />
                      </div>
                    </DialogContent>
                    <DialogActions className="mt-6">
                      <DialogTrigger disableButtonEnhancement>
                        <Button appearance="secondary">Cancel</Button>
                      </DialogTrigger>
                      <Button type="submit" appearance="primary" disabled={createLoading}>
                        {createLoading ? "Creating..." : "Create Admin"}
                      </Button>
                    </DialogActions>
                  </DialogBody>
                </form>
              </DialogSurface>
            </Dialog>
          </div>
        </div>

        {error && (
          <div className={styles.errorAlert}>
            <span>{error}</span>
          </div>
        )}

        <Card className={`${styles.tableCard} shadow-md overflow-hidden mt-6`}>
          <div className={styles.tableContainer}>
            <Table aria-label="Admins list" className={commonStyles.wFull}>
              <TableHeader className={styles.tableHeader}>
                <TableRow>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Created At</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex justify-center p-4">
                        <Spinner size="medium" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map(admin => (
                    <TableRow key={admin.id}>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        {admin.is_superadmin ? (
                          <Badge appearance="filled" color="brand">Super Admin</Badge>
                        ) : (
                          <Badge appearance="tint" color="informative">Admin</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(admin.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          appearance="subtle" 
                          icon={<Delete20Regular />} 
                          disabled={admin.is_superadmin}
                          onClick={() => handleDelete(admin.id)}
                          title={admin.is_superadmin ? "Cannot delete superadmin" : "Delete Admin"}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
