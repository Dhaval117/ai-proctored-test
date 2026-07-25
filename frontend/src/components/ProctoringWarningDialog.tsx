import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Text,
  Button,
} from '@fluentui/react-components'
import { Warning16Filled } from '@fluentui/react-icons'
import { useExamStyles } from "../pages/styles/ExamPage.styles"
import { useCommonStyles } from '../pages/styles/common.styles'

interface ProctoringWarningDialogProps {
  open: boolean
  warningMessage: string | null
  violationCount: number
  maxViolations: number
  onDismiss: () => void
}

export function ProctoringWarningDialog({
  open,
  warningMessage,
  violationCount,
  maxViolations,
  onDismiss,
}: ProctoringWarningDialogProps) {
  const styles = useExamStyles()
  const commonStyles = useCommonStyles()

  return (
    <Dialog
      open={open}
      modalType="alert"
      onOpenChange={(event, data) => {
        if (data.type === 'backdropClick' || data.type === 'escapeKeyDown') {
          event.preventDefault()
        }
      }}
    >
      <DialogSurface className={styles.dialogSurface}>
        <DialogBody>
          <DialogTitle className={styles.dialogTitle}>
            <div className={styles.dialogIconBox}><Warning16Filled /></div>
            Proctoring Warning
          </DialogTitle>
          <DialogContent>
            <Text className={styles.dialogText}>
              {warningMessage || 'A proctoring violation was detected.'}
            </Text>

            <div className={styles.dialogBadge}>
              Warning {violationCount} of {maxViolations}
            </div>
          </DialogContent>
          <DialogActions className={styles.dialogActions}>
            <Button
              appearance="primary"
              size="large"
              className={commonStyles.fullWidthButton}
              onClick={onDismiss}
            >
              I Understand — Return to Exam
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
