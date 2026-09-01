import { useRef, useState } from 'react';
import { Download, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import type { ThemePreference, WeekStart } from '@/domain/types';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Field,
  SegmentedControl,
  Switch,
  TextInput,
} from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCategories, useHabits, useSettings } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { pluralise } from '@/lib/format';

export function SettingsPage() {
  const settings = useSettings();
  const categories = useCategories();
  const habits = useHabits();
  const entryCount = useAppStore((state) => Object.keys(state.data.entries).length);
  const goalCount = useAppStore((state) => state.data.goals.length);

  const updateSettings = useAppStore((state) => state.updateSettings);
  const addCategory = useAppStore((state) => state.addCategory);
  const renameCategory = useAppStore((state) => state.renameCategory);
  const deleteCategory = useAppStore((state) => state.deleteCategory);
  const exportData = useAppStore((state) => state.exportData);
  const importData = useAppStore((state) => state.importData);
  const loadDemo = useAppStore((state) => state.loadDemoData);
  const resetAll = useAppStore((state) => state.resetAll);
  const notify = useAppStore((state) => state.notify);

  const fileInput = useRef<HTMLInputElement>(null);
  const [newCategory, setNewCategory] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'reset' | 'demo' | null>(null);

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cadence-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify('Data exported');
  };

  const handleImport = async (file: File) => {
    setImportError(null);
    const text = await file.text();
    const result = importData(text);
    if (!result.ok) setImportError(result.error);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Your data stays on this device. Export it any time."
      />

      <div className="flex max-w-2xl flex-col gap-5">
        <Card>
          <CardHeader title="Appearance" subtitle="Cadence keeps its identity in either theme." />
          <CardBody className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium tracking-wide text-muted uppercase">
                Theme
              </span>
              <SegmentedControl<ThemePreference>
                label="Theme"
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
              className="w-full"
          />
            </div>

            <Switch
              label="Reduce motion"
              description="Turn off the completion animation and transitions."
              checked={settings.reduceMotion}
              onChange={(reduceMotion) => updateSettings({ reduceMotion })}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Week" subtitle="Affects the calendar, the week strip and weekly goals." />
          <CardBody>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium tracking-wide text-muted uppercase">
                Week starts on
              </span>
              <SegmentedControl<string>
                label="Week starts on"
                value={String(settings.weekStart)}
                onChange={(value) => updateSettings({ weekStart: Number(value) as WeekStart })}
                options={[
                  { value: '1', label: 'Monday' },
                  { value: '0', label: 'Sunday' },
                ]}
              className="w-full"
          />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Categories"
            subtitle="Group habits so the library stays readable."
          />
          <CardBody className="flex flex-col gap-4">
            <ul className="flex flex-col divide-y divide-line">
              {categories.map((category) => {
                const inUse = habits.filter(
                  (habit) => habit.categoryId === category.id,
                ).length;
                return (
                  <li key={category.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                    <input
                      value={category.name}
                      aria-label={`Category name: ${category.name}`}
                      onChange={(event) => renameCategory(category.id, event.target.value)}
                      className="min-w-0 flex-1 rounded-sm bg-transparent px-1 py-1 text-[14px] text-ink transition-colors hover:bg-sunken focus:bg-sunken focus:outline-none"
                    />
                    <span className="tnum shrink-0 text-[12px] text-faint">
                      {inUse} {pluralise(inUse, 'habit')}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteCategory(category.id)}
                      disabled={category.system}
                      aria-label={
                        category.system
                          ? `${category.name} is a built-in category and cannot be deleted`
                          : `Delete category ${category.name}`
                      }
                      title={category.system ? 'Built-in category' : 'Delete category'}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-25"
                    >
                      <X size={14} strokeWidth={1.75} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>

            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newCategory.trim()) return;
                addCategory(newCategory);
                setNewCategory('');
                notify('Category added');
              }}
            >
              <Field label="New category" hideLabel className="flex-1">
                {(id) => (
                  <TextInput
                    id={id}
                    value={newCategory}
                    maxLength={24}
                    placeholder="Add a category"
                    onChange={(event) => setNewCategory(event.target.value)}
                  />
                )}
              </Field>
              <Button
                type="submit"
                variant="secondary"
                disabled={!newCategory.trim()}
                icon={<Plus size={15} strokeWidth={2} aria-hidden />}
              >
                Add
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Data"
            subtitle={`${habits.length} ${pluralise(habits.length, 'habit')} · ${entryCount} ${pluralise(entryCount, 'entry', 'entries')} · ${goalCount} ${pluralise(goalCount, 'goal')}`}
          />
          <CardBody className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={<Download size={15} strokeWidth={1.75} aria-hidden />}
                onClick={handleExport}
              >
                Export JSON
              </Button>
              <Button
                variant="secondary"
                icon={<Upload size={15} strokeWidth={1.75} aria-hidden />}
                onClick={() => fileInput.current?.click()}
              >
                Import
              </Button>
              <Button
                variant="gold"
                icon={<Sparkles size={15} strokeWidth={1.75} aria-hidden />}
                onClick={() => setConfirm('demo')}
              >
                Load demo data
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="Import Cadence data file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleImport(file);
                  event.target.value = '';
                }}
              />
            </div>

            {importError ? (
              <p role="alert" className="text-[12.5px] text-negative">
                {importError}
              </p>
            ) : (
              <p className="text-[12.5px] text-faint">
                Importing replaces everything currently stored. Export first if you want a backup.
              </p>
            )}

            <Switch
              label="Confirm before deleting"
              description="Ask before removing a habit, a goal or all your data."
              checked={settings.confirmDestructive}
              onChange={(confirmDestructive) => updateSettings({ confirmDestructive })}
            />
          </CardBody>
        </Card>

        <Card className="border-negative/25">
          <CardHeader
            title="Delete all data"
            subtitle="Habits, entries, goals and custom categories. This cannot be undone."
          />
          <CardBody>
            <Button
              variant="danger"
              icon={<Trash2 size={15} strokeWidth={1.75} aria-hidden />}
              onClick={() => (settings.confirmDestructive ? setConfirm('reset') : resetAll())}
            >
              Delete everything
            </Button>
          </CardBody>
        </Card>

        <p className="pb-2 text-center text-[12px] text-faint">
          Cadence · data stored locally in your browser
        </p>
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Delete all data?"
        message="Every habit, entry and goal will be removed from this device. Export your data first if you might want it back."
        confirmLabel="Delete everything"
        destructive
        onConfirm={() => {
          resetAll();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'demo'}
        title="Load demo data?"
        message="This replaces your current habits and history with a realistic sample so you can explore every screen."
        confirmLabel="Load demo data"
        onConfirm={() => {
          loadDemo();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
