import { makeStyles, tokens } from '@fluentui/react-components'

export const useSetupStyles = makeStyles({

  cardHeaderBox: {
    marginBottom: tokens.spacingVerticalXXS,
  },
  cardTitle: {
    display: 'block',
    marginBottom: tokens.spacingVerticalXXS,
  },
  cardSubtitle: {
    color: tokens.colorNeutralForeground3,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  fieldLabelSpan: {
    display: 'contents',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    fontWeight: 500,
  },
  chipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
  expGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
  expBtn: {
    borderRadius: tokens.borderRadiusMedium,
    fontWeight: 500,
  },
  expBtnActive: {
    fontWeight: 600,
  },
  submitContainer: {
    paddingTop: tokens.spacingVerticalS,
  },
  tooltipTrigger: {
    display: 'block',
    width: '100%',
  },
  footerNote: {
    marginTop: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground4,
  },
})
