import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    DialogContent,
    Button,
    Input,
    Label,
    Spinner,
    TabList,
    Tab,
    Textarea
} from '@fluentui/react-components';
import { Add20Regular, DocumentArrowUp20Regular } from '@fluentui/react-icons';
import { api } from '../lib/api';

interface CreateExamModalProps {
    onSuccess: () => void;
}

export const CreateExamModal: React.FC<CreateExamModalProps> = ({ onSuccess }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState<string>('manual');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdLink, setCreatedLink] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [language, setLanguage] = useState('');
    const [experience, setExperience] = useState('');
    const [expiresIn, setExpiresIn] = useState('24');
    const [resumeText, setResumeText] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isParsing, setIsParsing] = useState(false);

    const resetForm = () => {
        setName('');
        setEmail('');
        setLanguage('');
        setExperience('');
        setExpiresIn('24');
        setResumeText('');
        setError(null);
        setCreatedLink(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleOpenChange = (e: any, data: any) => {
        setIsOpen(data.open);
        if (!data.open) {
            resetForm();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.parseResume(formData);
            setLanguage(res.language);
            setExperience(String(res.experience_years));
            setResumeText(res.projects_summary);
        } catch (err: any) {
            setError(err.message || 'Failed to parse resume');
        } finally {
            setIsParsing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload: any = {
                name,
                email,
                expires_in_hours: parseInt(expiresIn, 24)
            };

            if (selectedTab === 'manual') {
                payload.language = language;
                payload.experience_years = parseInt(experience, 10);
            } else {
                payload.resume_text = resumeText || null;
            }

            const res = await api.createAdminSession(payload);

            const link = `${window.location.origin}/exam/${res.session_id}`;
            setCreatedLink(link);
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to create exam');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger disableButtonEnhancement>
                <Button appearance="primary" icon={<Add20Regular />}>Create Exam</Button>
            </DialogTrigger>
            <DialogSurface className="max-w-xl">
                <form onSubmit={handleSubmit}>
                    <DialogBody>
                        <DialogTitle>Create New Exam</DialogTitle>
                        <DialogContent className="flex flex-col gap-4 py-4">
                            {createdLink ? (
                                <div className="bg-green-50 p-4 rounded border border-green-200">
                                    <h4 className="text-green-800 font-semibold mb-2">Exam Created Successfully!</h4>
                                    <p className="text-sm mb-2 text-green-900">Send this link to the candidate:</p>
                                    <div className="flex gap-2">
                                        <Input readOnly value={createdLink} className="flex-1" />
                                        <Button onClick={() => navigator.clipboard.writeText(createdLink)}>Copy</Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <Label required htmlFor="candidateName">Candidate Name</Label>
                                            <Input id="candidateName" required value={name} onChange={e => setName(e.target.value)} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Label required htmlFor="candidateEmail">Candidate Email</Label>
                                            <Input id="candidateEmail" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Label required htmlFor="validityHours">Validity (Hours)</Label>
                                        <Input id="validityHours" type="number" min="1" required value={expiresIn} onChange={e => setExpiresIn(e.target.value)} />
                                    </div>

                                    <TabList selectedValue={selectedTab} onTabSelect={(_, d) => setSelectedTab(d.value as string)} className="mt-4">
                                        <Tab value="manual">Manual Setup</Tab>
                                        <Tab value="resume">Resume Upload</Tab>
                                    </TabList>

                                    {selectedTab === 'resume' && (
                                        <div className="border border-neutral-200 p-4 rounded bg-neutral-50 flex flex-col gap-3">
                                            <Label>Upload PDF Resume</Label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    ref={fileInputRef}
                                                    onChange={handleFileChange}
                                                    className="block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                                                />
                                                {isParsing && <Spinner size="small" />}
                                            </div>
                                            <Textarea
                                                placeholder="Parsed Project Summary (auto-filled)"
                                                value={resumeText}
                                                onChange={e => setResumeText(e.target.value)}
                                                rows={4}
                                            />
                                        </div>
                                    )}

                                    {selectedTab === 'manual' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <Label required htmlFor="technologyLanguage">Technology / Language</Label>
                                                <Input id="technologyLanguage" required value={language} onChange={e => setLanguage(e.target.value)} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <Label required htmlFor="experienceYears">Years of Experience</Label>
                                                <Input id="experienceYears" type="number" min="0" required value={experience} onChange={e => setExperience(e.target.value)} />
                                            </div>
                                        </div>
                                    )}

                                    {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
                                </>
                            )}
                        </DialogContent>
                        <DialogActions>
                            {!createdLink && (
                                <>
                                    <DialogTrigger disableButtonEnhancement>
                                        <Button appearance="secondary">Cancel</Button>
                                    </DialogTrigger>
                                    <Button type="submit" appearance="primary" disabled={loading || isParsing}>
                                        {loading ? <Spinner size="tiny" /> : 'Create Exam'}
                                    </Button>
                                </>
                            )}
                            {createdLink && (
                                <DialogTrigger disableButtonEnhancement>
                                    <Button appearance="primary">Close</Button>
                                </DialogTrigger>
                            )}
                        </DialogActions>
                    </DialogBody>
                </form>
            </DialogSurface>
        </Dialog>
    );
};
