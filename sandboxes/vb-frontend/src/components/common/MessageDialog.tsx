import React from 'react';
import Button from './Button';
import Modal from './Modal';

interface MessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  okText?: string;
}

const MessageDialog: React.FC<MessageDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  okText = 'OK',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="mt-2">
        <p className="text-sm text-text">{message}</p>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={onClose}>
          {okText}
        </Button>
      </div>
    </Modal>
  );
};

export default MessageDialog;
