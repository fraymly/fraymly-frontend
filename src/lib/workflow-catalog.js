import {
  Hash,
  PenSquare,
  ZoomIn,
  Fingerprint
} from 'lucide-react'

export const WORKFLOW_NODE_CATALOG = [
  {
    type: 'caption_generation',
    label: 'Caption Generation',
    group: 'editing',
    icon: PenSquare,
  },
  {
    type: 'title_generation',
    label: 'Title Generation',
    group: 'publishing',
    icon: PenSquare,
  },
  {
    type: 'description_generation',
    label: 'Description Generation',
    group: 'publishing',
    icon: PenSquare,
  },
  {
    type: 'hashtag_generation',
    label: 'Hashtag Generation',
    group: 'publishing',
    icon: Hash,
  },
  { type: 'auto_zoom', label: 'Auto Zoom', group: 'editing', icon: ZoomIn },
  { type: 'speaker_focus', label: 'Speaker Focus', group: 'editing', icon: Fingerprint },
]
