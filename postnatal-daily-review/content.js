/*
 * Postnatal daily review — documentation content only.
 *
 * This module lists clinician-facing labels and phrase snippets for a
 * documentation aid. It must not encode clinical decision support: no risk
 * scores, thresholds, management rules, or automatic inference from values.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PostnatalDailyReviewContent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function opt(value, label, extra) {
    var o = { value: value, label: label };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }

  var STEPS = [
    { id: 'context', label: 'Context' },
    { id: 'progress', label: 'Progress' },
    { id: 'pathways', label: 'Pathways' },
    { id: 'examination', label: 'Examination' },
    { id: 'plan', label: 'Plan' }
  ];

  var PLACES = [
    { value: 'postnatal', label: 'Postnatal ward' },
    { value: 'tc', label: 'Transitional care' },
    { value: 'other', label: 'Other' }
  ];

  var PATHWAYS = [
    { id: 'sepsis', label: 'Suspected sepsis' },
    { id: 'late-preterm', label: 'Late preterm pathway' },
    { id: 'temperature', label: 'Temperature management' },
    { id: 'hypoglycaemia', label: 'Hypoglycaemia' }
  ];

  var THERMAL_CARE = [
    { value: 'cot', label: 'Cot', prose: 'Cared for in a cot.' },
    { value: 'skin', label: 'Skin-to-skin', prose: 'Skin-to-skin documented.' },
    { value: 'incubator', label: 'Incubator', prose: 'In incubator.' }
  ];

  var HYPO_REASONS = [
    { value: 'idm', label: 'Maternal diabetes', prose: 'Maternal diabetes documented.' },
    { value: 'beta-blocker', label: 'Maternal beta-blocker', prose: 'Maternal beta-blocker documented.' },
    { value: 'sga', label: 'Birth weight on or under the 2nd centile', prose: 'Birth weight on or under the 2nd centile documented.' },
    { value: 'wasted', label: 'Clinical wasting', prose: 'Clinical wasting documented.' },
    { value: 'other', label: 'Other' }
  ];

  var HYPO_SYMPTOMS = [
    { value: 'none', label: 'None documented' },
    { value: 'jitteriness', label: 'Jitteriness' },
    { value: 'poor-feeding', label: 'Poor feeding' },
    { value: 'lethargy', label: 'Lethargy' },
    { value: 'other', label: 'Other' }
  ];

  var CULTURE_STATUS = [
    { value: 'pending', label: 'Pending', prose: 'Blood culture pending.' },
    { value: 'no-growth', label: 'No growth to date', prose: 'Blood culture no growth to date.' },
    { value: 'growth', label: 'Growth' }
  ];

  var JAUNDICE = [
    { value: 'none', label: 'None documented', prose: 'No clinical jaundice.' },
    { value: 'clinical', label: 'Clinical jaundice', prose: 'Clinical jaundice documented.' },
    { value: 'tcb', label: 'Transcutaneous' },
    { value: 'tsb', label: 'Serum' }
  ];

  var PLAN_PHRASES = [
    { id: 'abx-continue', label: 'Continue antibiotics', text: 'Continue current antibiotics.', pathways: ['sepsis'] },
    { id: 'culture-pending', label: 'Culture pending', text: 'Blood culture still pending.', pathways: ['sepsis'] },
    { id: 'repeat-crp', label: 'Repeat CRP as planned', text: 'Repeat CRP as planned.', pathways: ['sepsis'] },
    { id: 'review-culture', label: 'Review with culture', text: 'Review with the culture result.', pathways: ['sepsis'] },
    { id: 'feed-continue', label: 'Continue feeding plan', text: 'Continue current feeding plan.', pathways: ['late-preterm', 'hypoglycaemia'] },
    { id: 'obs-continue', label: 'Continue observations', text: 'Continue observations.', pathways: ['late-preterm', 'sepsis', 'temperature'] },
    { id: 'feed-support', label: 'Feeding support', text: 'Continue feeding support.', pathways: ['late-preterm'] },
    { id: 'parent-info', label: 'Parent information given', text: 'Parent information given as discussed.', pathways: ['late-preterm'] },
    { id: 'thermal-continue', label: 'Continue thermal care', text: 'Continue current thermal care.', pathways: ['temperature', 'late-preterm'] },
    { id: 'temp-recheck', label: 'Recheck temperature as charted', text: 'Recheck temperature as charted.', pathways: ['temperature'] },
    { id: 'incubator-wean', label: 'Wean incubator as planned', text: 'Wean incubator as planned.', pathways: ['temperature'] },
    { id: 'glucose-continue', label: 'Continue glucose checks', text: 'Continue blood glucose monitoring.', pathways: ['hypoglycaemia', 'late-preterm'] },
    { id: 'glucose-recheck', label: 'Recheck glucose as planned', text: 'Recheck glucose as planned.', pathways: ['hypoglycaemia'] },
    { id: 'review-tomorrow', label: 'Review tomorrow', text: 'Review tomorrow.' },
    { id: 'review-later', label: 'Review later today', text: 'Review later today.' },
    { id: 'safety', label: 'Safety-net advice', text: 'Safety-net advice given as discussed with the parents.' }
  ];

  var EXAM_SYSTEMS = [
    {
      id: 'general',
      label: 'General',
      shortLabel: 'General appearance',
      nad: 'Appears well.',
      controls: [
        {
          id: 'wellbeing',
          label: 'Appearance',
          type: 'single',
          options: [
            opt('well', 'Well', { prose: 'Appears well.' }),
            opt('mild', 'Mildly unwell', { abnormal: true, prose: 'Appears mildly unwell.' }),
            opt('unwell', 'Unwell', { abnormal: true, prose: 'Appears unwell.' })
          ]
        },
        {
          id: 'cry',
          label: 'Cry',
          type: 'single',
          options: [
            opt('settled', 'Settled', { prose: 'Settled.' }),
            opt('usual', 'Usual cry', { prose: 'Cry usual.' }),
            opt('unusual', 'Unusual pitch', { abnormal: true, prose: 'Cry unusual in pitch.' })
          ]
        }
      ]
    },
    {
      id: 'breathing',
      label: 'Breathing',
      shortLabel: 'Breathing',
      nad: 'Comfortable, no increased work of breathing documented.',
      controls: [
        {
          id: 'effort',
          label: 'Work of breathing',
          type: 'single',
          options: [
            opt('comfortable', 'Comfortable', { prose: 'Comfortable.' }),
            opt('increased', 'Increased', { abnormal: true, prose: 'Increased work of breathing.' })
          ]
        },
        {
          id: 'grunting',
          label: 'Grunting',
          type: 'yn',
          options: [
            opt('yes', 'Yes', { abnormal: true, prose: 'Grunting.' }),
            opt('no', 'No', { prose: 'No grunting.' })
          ]
        }
      ]
    },
    {
      id: 'colour',
      label: 'Colour',
      shortLabel: 'Colour',
      nad: 'No colour concern documented.',
      controls: [
        {
          id: 'colour',
          label: 'Colour',
          type: 'single',
          options: [
            opt('pink', 'Pink', { prose: 'Pink.' }),
            opt('pale', 'Pale', { abnormal: true, prose: 'Pale.' }),
            opt('jaundiced', 'Jaundiced', { abnormal: true, prose: 'Jaundiced.' }),
            opt('mottled', 'Mottled', { abnormal: true, prose: 'Mottled.' })
          ]
        }
      ]
    },
    {
      id: 'abdomen',
      label: 'Abdomen',
      shortLabel: 'Abdomen',
      nad: 'Soft abdomen.',
      controls: [
        {
          id: 'feel',
          label: 'Feel',
          type: 'single',
          options: [
            opt('soft', 'Soft', { prose: 'Soft abdomen.' }),
            opt('distended', 'Distended', { abnormal: true, prose: 'Distended abdomen.' })
          ]
        }
      ]
    },
    {
      id: 'tone',
      label: 'Tone',
      shortLabel: 'Tone',
      nad: 'Tone as previously documented.',
      controls: [
        {
          id: 'tone',
          label: 'Tone',
          type: 'single',
          options: [
            opt('usual', 'As previously', { prose: 'Tone as previously documented.' }),
            opt('reduced', 'Reduced', { abnormal: true, prose: 'Reduced tone.' })
          ]
        }
      ]
    }
  ];

  return {
    STEPS: STEPS,
    PLACES: PLACES,
    PATHWAYS: PATHWAYS,
    THERMAL_CARE: THERMAL_CARE,
    HYPO_REASONS: HYPO_REASONS,
    HYPO_SYMPTOMS: HYPO_SYMPTOMS,
    CULTURE_STATUS: CULTURE_STATUS,
    JAUNDICE: JAUNDICE,
    PLAN_PHRASES: PLAN_PHRASES,
    EXAM_SYSTEMS: EXAM_SYSTEMS
  };
});
