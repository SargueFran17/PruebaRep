import { Button, Modal } from '@/components/ui';
import type { Habit } from '@/domain/types';
import { useCategories, useSettings } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import type { HabitDraft } from '@/store/useAppStore';
import { HabitForm } from './HabitForm';

interface HabitDialogProps {
  open: boolean;
  habit?: Habit;
  onClose: () => void;
}

export function HabitDialog({ open, habit, onClose }: HabitDialogProps) {
  const categories = useCategories();
  const { weekStart } = useSettings();
  const addHabit = useAppStore((state) => state.addHabit);
  const updateHabit = useAppStore((state) => state.updateHabit);
  const notify = useAppStore((state) => state.notify);

  const handleSubmit = (draft: HabitDraft) => {
    if (habit) {
      updateHabit(habit.id, draft);
      notify(`${draft.name} updated`);
    } else {
      addHabit(draft);
      notify(`${draft.name} added`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? 'Edit habit' : 'New habit'}
      description={
        habit ? 'Changes apply from today onwards.' : 'Two fields is enough to start.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="habit-form">
            {habit ? 'Save changes' : 'Create habit'}
          </Button>
        </>
      }
    >
      {open ? (
        <HabitForm
          key={habit?.id ?? 'new'}
          habit={habit}
          categories={categories}
          weekStart={weekStart}
          onSubmit={handleSubmit}
        />
      ) : null}
    </Modal>
  );
}
