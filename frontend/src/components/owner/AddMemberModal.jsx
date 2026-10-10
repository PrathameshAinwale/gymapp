import React from 'react';
import { Modal } from '../common/Modal';
import { AddMemberPage } from './AddMemberPage';

export const AddMemberModal = ({
  isOpen,
  onClose,
  initialData = null,
  isUpgrade = false,
  upgradeMember = null,
  isEdit = false,
  editMember = null,
  onMemberAdded
}) => {
  if (!isOpen) return null;

  const isUpgradeMode = Boolean(isUpgrade || upgradeMember || initialData?.isUpgrade);
  const isEditMode = Boolean(isEdit || editMember || initialData?.isEdit || initialData?.isEditMode);
  const target = upgradeMember || editMember || initialData;

  const title = isUpgradeMode
    ? `Upgrade Services: ${target?.name || 'Member'}`
    : isEditMode
      ? `Edit Athlete Dossier: ${target?.name || 'Member'}`
      : 'Register New Member';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-4xl"
    >
      <div className="max-h-[82vh] overflow-y-auto px-1 sm:px-4 py-2">
        <AddMemberPage
          initialData={initialData}
          isUpgrade={isUpgrade}
          upgradeMember={upgradeMember}
          isEdit={isEdit}
          editMember={editMember}
          isModal={true}
          onBack={onClose}
          onNavigateTab={onClose}
          onMemberAdded={(member) => {
            if (onMemberAdded) onMemberAdded(member);
            onClose();
          }}
        />
      </div>
    </Modal>
  );
};
