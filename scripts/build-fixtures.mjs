// Builds the mock fixtures in src/mocks/fixtures from the raw API responses
// captured in docs/api-samples (gitignored, because they hold real candidates'
// personal data).
//
// What is kept from the real responses: every field name, nesting, array
// length, timestamp, speaker label, risk value, confidence and disposition.
// What is replaced: names, emails, ids, storage URLs, transcript text, identity
// evidence text, and any observation that describes a person's appearance.
//
// Campaign 900 is mock-only. It reuses real segment shapes with altered risk
// values so every verdict and risk level can be demonstrated offline.
//
// Usage: node scripts/build-fixtures.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const samplesDir = join(root, 'docs', 'api-samples');
const outDir = join(root, 'src', 'mocks', 'fixtures');

const KEEP_EMAILS = new Set(['stephtester1@readie.io']);
const PEOPLE = [
  ['Amara Obi', 'amara.obi@example.com'],
  ['Kofi Mensah', 'kofi.mensah@example.com'],
  ['Lena Fischer', 'lena.fischer@example.com'],
  ['Tunde Bello', 'tunde.bello@example.com'],
  ['Priya Nair', 'priya.nair@example.com'],
  ['Sam Carter', 'sam.carter@example.com'],
  ['Maya Chen', 'maya.chen@example.com'],
  ['Diego Ruiz', 'diego.ruiz@example.com'],
  ['Zainab Yusuf', 'zainab.yusuf@example.com'],
  ['Noah Lindqvist', 'noah.lindqvist@example.com'],
];

const INTERVIEWER_LINES = [
  'Thanks for joining. To start, could you tell me a little about yourself?',
  'Great. What drew you to this role in particular?',
  'Could you walk me through a recent project you are proud of?',
  'How did you decide what to prioritise when the deadline moved?',
  'Okay.',
  'What would you do differently if you ran that project again?',
  'How do you usually handle disagreement within a team?',
  'Can you give me a concrete example of that?',
  'Understood. And how did you measure whether it worked?',
  'Tell me about a time you received difficult feedback.',
  'How do you keep your skills current?',
  'What does a good first ninety days look like to you?',
  'Right, that makes sense.',
  'Do you have any questions for me before we wrap up?',
  'Thank you, that is everything from my side.',
];

const CANDIDATE_LINES = [
  'Thank you for having me. I have spent the last few years working across product teams, mostly on customer-facing tools, and I enjoy the part of the work where a vague problem turns into something people can actually use.',
  'The role combines two things I care about: working closely with users and having enough ownership to see a piece of work through from the first conversation to the release.',
  'Sure. The most recent one was a redesign of an onboarding flow. Completion had dropped, so I started by watching session recordings and talking to five customers before changing anything.',
  'I listed what was blocking people, ranked the items by how many users each one affected, and agreed the top three with the team. Everything else went into a later milestone.',
  'Yes.',
  'I would involve support earlier. They already knew about two of the issues we only discovered in testing, and that would have saved about a week.',
  'I try to separate the decision from the people. I write down the options, what each one costs, and what we would need to see to change our minds, then we pick one and review it after a fixed period.',
  'On one project we disagreed about whether to rebuild a component or patch it. We agreed to patch it, set a date to revisit, and when the date came the data made the rebuild an easy call.',
  'We tracked completion rate and time to first action. Completion went up within the first two weeks and stayed there, and support tickets on that flow dropped.',
  'A lead once told me my updates were hard to follow. I asked for an example, rewrote my weekly note around decisions and blockers, and asked the same person to review the next two.',
  'I set aside a few hours a week for it. Usually that means reading release notes for the tools I use, and building one small thing with anything new before I bring it into real work.',
  'Listening first. I would want to understand how the team works and where the pain is, pick up a small piece of work to deliver early, and agree on what success looks like with my manager.',
  'That is fair, and I agree.',
  'Yes, two. How does the team decide what to work on each quarter, and how will success be measured for this role?',
  'Thank you for your time. I enjoyed the conversation.',
];

const PARTICIPANT_LINES = [
  'Can you see my screen now?',
  'Yes, it is showing. Go to the settings page first.',
  'Okay, I am on the settings page. Which section should I open?',
  'Open the profile section and scroll down to the verification step.',
  'Right, I see it. It is asking me to confirm the email address.',
  'Confirm it, then come back to the dashboard and refresh.',
  'Done. The dashboard shows the new status now.',
  'Good. Next we will look at how the results are listed.',
  'One moment, I need to silence a notification.',
  'No problem, take your time.',
  'Okay, I am back. Where were we?',
  'We were about to open the results list and filter by date.',
];

const IDENTITY_EVIDENCE = [
  'Reference video: the candidate is visible in the webcam feed with clothing and general appearance that can be compared against the interview recording.',
  'Interview video: the candidate shows matching visible characteristics, including clothing, hairstyle and facial structure.',
];
const IDENTITY_CONFLICTS = [
  'Facial structure in the interview recording differs from the reference video around the jawline and brow.',
  'The person answering questions after the reconnect does not match the reference video.',
];
const IDENTITY_LIMITATIONS = [
  'The reference video webcam feed is a small picture-in-picture window with low effective resolution.',
  'Lighting casts shadows across the upper face in both videos.',
  'Multiple individuals are present in the interview video.',
];
const APPEARANCE_WORDS = /baseball cap|yoruba|whatsapp|locs|dreadlocks/i;
const GENERIC_LIMITATION = 'Fixed camera angle and standard webcam video resolution.';
const GENERIC_OBSERVATION = {
  syntheticVideo:
    'Natural facial movements and stable features with no signs of synthetic generation.',
  personContinuity: 'The same individual remains present throughout the recording.',
  audioVideoConsistency: 'Spoken audio aligns with visible mouth movements.',
  possibleOffScreenAssistance:
    'Gaze and head movement are consistent with normal conversation; no sustained off-screen reading.',
};
const CHECK_KEYS = Object.keys(GENERIC_OBSERVATION);

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const shortHash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 12);

const people = new Map();
function personFor(email) {
  if (KEEP_EMAILS.has(email)) return { name: 'Steph Tester', email };
  const key = email.replace(/\s+\d+(?=@)/, '');
  if (!people.has(key)) {
    const [name, fakeEmail] = PEOPLE[people.size % PEOPLE.length];
    people.set(key, { name, email: fakeEmail });
  }
  const person = people.get(key);
  // One real room has a space inside the email part; keep that edge case.
  return /\s/.test(email) ? { ...person, email: person.email.replace('@', ' 12@') } : person;
}

const roomNames = new Map();
function scrubRoomName(roomName) {
  if (roomNames.has(roomName)) return roomNames.get(roomName);
  const [prefix, email, hash] = roomName.split('~~');
  const person = personFor(email);
  const parts = [prefix, person.email];
  if (hash !== undefined) parts.push(KEEP_EMAILS.has(email) ? hash : shortHash(hash));
  const scrubbed = parts.join('~~');
  roomNames.set(roomName, scrubbed);
  return scrubbed;
}

const userIds = new Map();
const scrubUserId = (id) => {
  if (id === null) return null;
  if (!userIds.has(id)) userIds.set(id, 5000 + userIds.size);
  return userIds.get(id);
};

let lineCursor = 0;
function scrubTranscript(entries, recordKey) {
  const counters = { INTERVIEWER: 0, INTERVIEWEE: 0, PARTICIPANT: 0 };
  return entries.map((entry) => {
    const bank =
      entry.speaker === 'INTERVIEWER'
        ? INTERVIEWER_LINES
        : entry.speaker === 'INTERVIEWEE'
          ? CANDIDATE_LINES
          : PARTICIPANT_LINES;
    const index = (counters[entry.speaker] ?? lineCursor++) % bank.length;
    if (entry.speaker in counters) counters[entry.speaker] += 1;
    return {
      timestamp: entry.timestamp,
      speaker: entry.speaker,
      text: bank[index],
      videoUrl: `gs://mock-recordings/${recordKey}/composite.mp4`,
    };
  });
}

function scrubCheck(check, key) {
  return {
    ...check,
    observations: check.observations.map((item) => ({
      ...item,
      observation: APPEARANCE_WORDS.test(item.observation)
        ? GENERIC_OBSERVATION[key]
        : item.observation,
    })),
  };
}

function scrubAnalytic(analytic, recordKey, candidateId) {
  if (analytic === null) return null;
  const gemini = analytic.deepfake_phase2.gemini;
  const identity = analytic.identity_phase1;
  return {
    identity_phase1:
      identity === null
        ? null
        : {
            ...identity,
            matchingEvidence: identity.matchingEvidence.map((item, index) => ({
              ...item,
              observation: IDENTITY_EVIDENCE[index % IDENTITY_EVIDENCE.length],
            })),
            conflictingEvidence: identity.conflictingEvidence.map((item, index) => ({
              ...item,
              observation: IDENTITY_CONFLICTS[index % IDENTITY_CONFLICTS.length],
            })),
            limitations: identity.limitations.map(
              (_, index) => IDENTITY_LIMITATIONS[index % IDENTITY_LIMITATIONS.length],
            ),
          },
    deepfake_phase2: {
      ...analytic.deepfake_phase2,
      gemini: {
        ...gemini,
        ...Object.fromEntries(CHECK_KEYS.map((key) => [key, scrubCheck(gemini[key], key)])),
        limitations: gemini.limitations.map((text) =>
          APPEARANCE_WORDS.test(text) ? GENERIC_LIMITATION : text,
        ),
        transcript: { entries: scrubTranscript(gemini.transcript.entries, recordKey) },
      },
    },
    candidateId: analytic.candidateId === null ? null : String(candidateId),
    disposition: analytic.disposition,
    humanReviewRequired: analytic.humanReviewRequired,
  };
}

let recordCounter = 0;
function scrubRecord(record) {
  const roomName = scrubRoomName(record.roomName);
  recordCounter += 1;
  const recordKey = `c${record.campaignId}-r${String(recordCounter).padStart(3, '0')}`;
  const mediaUrl = `https://storage.example.com/recordings/${recordKey}/composite.mp4`;
  const userId = scrubUserId(record.userId);
  return {
    ...record,
    roomName,
    objectPath: mediaUrl,
    finalUrl: record.finalUrl === null ? null : mediaUrl,
    egressId: `EG_MOCK${String(recordCounter).padStart(6, '0')}`,
    userId,
    extractedEmail: roomName.split('~~').at(-1),
    campaignAssessments: record.campaignAssessments.map((assessment) => ({
      ...assessment,
      user_id: userId,
      video_url_link: `https://storage.example.com/assessments/${recordKey}.webm`,
    })),
    analytic: scrubAnalytic(record.analytic, recordKey, userId),
  };
}

function scrubJob(job) {
  const [, email] = job.roomName.split('~~');
  const person = personFor(email);
  const userId = scrubUserId(job.userId);
  const candidateUserId = scrubUserId(job.candidateUserId);
  return {
    ...job,
    roomName: scrubRoomName(job.roomName),
    userId,
    candidateUserId,
    candidateId: candidateUserId === null ? null : String(candidateUserId),
    candidateName: job.candidateName === null ? null : person.name,
    candidateEmail: person.email,
    campaign_assessment_video_link: job.campaign_assessment_video_link.map((item) => ({
      ...item,
      video_url_link: 'https://storage.example.com/assessments/assessment.webm',
      invigilatorVideoUrlLink: 'https://storage.example.com/recordings/camera.webm',
      userId: String(candidateUserId ?? userId),
      userName: person.name,
      userEmail: person.email,
    })),
  };
}

// ---------------------------------------------------------------------------
// Real campaigns
// ---------------------------------------------------------------------------

const campaigns = {};
for (const id of [119, 120, 122, 123]) {
  campaigns[id] = readJson(join(samplesDir, `campaign-${id}.json`)).map(scrubJob);
}

const rooms = {};
for (const file of readdirSync(join(samplesDir, 'rooms')).sort()) {
  const records = readJson(join(samplesDir, 'rooms', file)).map(scrubRecord);
  const first = records[0];
  if (first !== undefined) rooms[first.roomName] = records;
}

// ---------------------------------------------------------------------------
// Mock-only campaign 900: one room per verdict and analysis state
// ---------------------------------------------------------------------------

const DEMO_CAMPAIGN = 900;
const analysedTemplates = Object.values(rooms)
  .flat()
  .filter((record) => record.analytic !== null)
  .sort(
    (a, b) =>
      b.analytic.deepfake_phase2.gemini.transcript.entries.length -
      a.analytic.deepfake_phase2.gemini.transcript.entries.length,
  );
const identityTemplate = Object.values(rooms)
  .flat()
  .find((record) => record.analytic?.identity_phase1 != null).analytic.identity_phase1;
const pendingTemplate = Object.values(rooms)
  .flat()
  .find((record) => record.analytic === null);

let demoRecordId = 9000;
const clone = (value) => structuredClone(value);
const addMinutes = (iso, minutes) =>
  new Date(Date.parse(`${iso}Z`) + minutes * 60_000).toISOString().replace('Z', '000');

function demoSegment(roomName, startedAt, offsetMinutes, template, patch) {
  const record = clone(template);
  const id = demoRecordId++;
  const createdAt = addMinutes(startedAt, offsetMinutes);
  Object.assign(record, {
    roomName,
    campaignId: DEMO_CAMPAIGN,
    parsedCampaignId: String(DEMO_CAMPAIGN),
    campaignRecordId: id,
    egressId: `EG_DEMO${String(id).padStart(6, '0')}`,
    userId: 5900,
    extractedEmail: roomName.split('~~').at(-1),
    objectPath: `https://storage.example.com/recordings/c900-r${id}/composite.mp4`,
    finalUrl: `https://storage.example.com/recordings/c900-r${id}/composite.mp4`,
    createdAt,
    nextCheckAt: addMinutes(createdAt.slice(0, -3), 4),
    persistedAt: addMinutes(createdAt.slice(0, -3), 4),
    updatedAt: addMinutes(createdAt.slice(0, -3), 4),
    campaignAssessments: [],
  });
  patch(record);
  return record;
}

function setCheck(record, key, risk, confidence, observations) {
  const check = record.analytic.deepfake_phase2.gemini[key];
  check.risk = risk;
  check.confidence = confidence;
  if (observations !== undefined) {
    const { source, category } = check.observations[0];
    check.observations = observations.map(([timestamp, observation]) => ({
      timestamp,
      source,
      category,
      observation,
    }));
  }
}

function setDisposition(record, { overallRisk, phase2, overall, humanReview }) {
  record.analytic.deepfake_phase2.gemini.overallRisk = overallRisk;
  record.analytic.deepfake_phase2.disposition = phase2;
  record.analytic.deepfake_phase2.humanReviewRequired = phase2 !== 'PASS_WITH_LOW_RISK';
  record.analytic.disposition = overall;
  record.analytic.humanReviewRequired = humanReview;
  record.analyticsCompleted = 'Y';
}

const demoStart = '2026-11-04T10:00:00.000';
const demoRooms = [
  {
    email: 'passed.demo@example.com',
    name: 'Passed Demo',
    progress: 100,
    completed: true,
    startedAt: demoStart,
    segments: (roomName, startedAt) => [
      demoSegment(roomName, startedAt, 0, analysedTemplates[0], (record) => {
        record.analytic.identity_phase1 = {
          ...clone(identityTemplate),
          confidence: 0.93,
          multiplePeopleDetected: false,
          limitations: [IDENTITY_LIMITATIONS[0]],
        };
        setDisposition(record, {
          overallRisk: 'LOW',
          phase2: 'PASS_WITH_LOW_RISK',
          overall: 'PASS_WITH_LOW_RISK',
          humanReview: false,
        });
      }),
      demoSegment(roomName, startedAt, 4, analysedTemplates[1], (record) => {
        setDisposition(record, {
          overallRisk: 'LOW',
          phase2: 'PASS_WITH_LOW_RISK',
          overall: 'PASS_WITH_LOW_RISK',
          humanReview: false,
        });
      }),
    ],
  },
  {
    email: 'warning.demo@example.com',
    name: 'Warning Demo',
    progress: 100,
    completed: true,
    startedAt: '2026-11-04T11:30:00.000',
    segments: (roomName, startedAt) => [
      demoSegment(roomName, startedAt, 0, analysedTemplates[2], (record) => {
        record.analytic.identity_phase1 = {
          ...clone(identityTemplate),
          confidence: 0.64,
          referenceVideoQuality: 'POOR',
          multiplePeopleDetected: true,
          conflictingEvidence: [
            {
              timestamp: '01:12',
              source: identityTemplate.matchingEvidence[0].source,
              category: 'IDENTITY_CONFLICT',
              observation: IDENTITY_CONFLICTS[0],
            },
          ],
        };
        setCheck(record, 'possibleOffScreenAssistance', 'MEDIUM', 0.74, [
          ['00:42', 'Candidate reads from a point to the left of the camera for several seconds.'],
          ['02:15', 'Gaze returns repeatedly to the same off-screen position while answering.'],
        ]);
        setCheck(record, 'audioVideoConsistency', 'MEDIUM', 0.7, [
          ['01:03', 'A second voice is faintly audible while the candidate is not speaking.'],
          ['02:48', 'Brief audio dropout that does not match the video feed.'],
        ]);
        setDisposition(record, {
          overallRisk: 'MEDIUM',
          phase2: 'REVIEW_REQUIRED',
          overall: 'REVIEW_REQUIRED',
          humanReview: true,
        });
      }),
      demoSegment(roomName, startedAt, 4, analysedTemplates[3], (record) => {
        setDisposition(record, {
          overallRisk: 'LOW',
          phase2: 'PASS_WITH_LOW_RISK',
          overall: 'REVIEW_REQUIRED',
          humanReview: true,
        });
      }),
    ],
  },
  {
    email: 'failed.demo@example.com',
    name: 'Failed Demo',
    progress: 100,
    completed: true,
    startedAt: '2026-11-04T13:00:00.000',
    segments: (roomName, startedAt) => [
      demoSegment(roomName, startedAt, 0, analysedTemplates[4], (record) => {
        record.analytic.identity_phase1 = {
          ...clone(identityTemplate),
          decision: 'INCONSISTENT',
          confidence: 0.31,
          multiplePeopleDetected: true,
          matchingEvidence: [],
          conflictingEvidence: IDENTITY_CONFLICTS.map((observation, index) => ({
            timestamp: index === 0 ? '00:20' : '02:31',
            source: identityTemplate.matchingEvidence[0].source,
            category: 'IDENTITY_CONFLICT',
            observation,
          })),
        };
        setCheck(record, 'personContinuity', 'HIGH', 0.9, [
          ['02:29', 'The person on camera changes after the feed reconnects.'],
        ]);
        setCheck(record, 'syntheticVideo', 'MEDIUM', 0.66, [
          ['02:35', 'Edge warping around the face during fast head movement.'],
        ]);
        setCheck(record, 'possibleOffScreenAssistance', 'HIGH', 0.88, [
          ['00:58', 'A second device is held below the frame and referenced while answering.'],
          ['01:40', 'A second person leans into frame and speaks to the candidate.'],
          ['03:05', 'Candidate reads an answer verbatim from an off-screen source.'],
        ]);
        setDisposition(record, {
          overallRisk: 'HIGH',
          phase2: 'FAIL_HIGH_RISK',
          overall: 'FAIL_HIGH_RISK',
          humanReview: true,
        });
      }),
    ],
  },
  {
    email: 'processing.demo@example.com',
    name: null,
    progress: 33.33333,
    completed: false,
    startedAt: '2026-11-05T08:15:00.000',
    segments: (roomName, startedAt) => [
      demoSegment(roomName, startedAt, 0, analysedTemplates[5], (record) => {
        setDisposition(record, {
          overallRisk: 'LOW',
          phase2: 'PASS_WITH_LOW_RISK',
          overall: 'REVIEW_REQUIRED',
          humanReview: true,
        });
      }),
      demoSegment(roomName, startedAt, 4, pendingTemplate, (record) => {
        record.analyticsCompleted = 'P';
      }),
      demoSegment(roomName, startedAt, 8, pendingTemplate, (record) => {
        record.analyticsCompleted = 'N';
      }),
    ],
  },
  {
    email: 'recording-failed.demo@example.com',
    name: 'Recording Failed Demo',
    progress: 0,
    completed: false,
    startedAt: '2026-11-05T09:40:00.000',
    segments: (roomName, startedAt) => [
      demoSegment(roomName, startedAt, 0, pendingTemplate, (record) => {
        record.status = 'FAILED';
        record.attempts = 12;
        record.finalUrl = null;
        record.analyticsCompleted = 'N';
      }),
    ],
  },
];

campaigns[DEMO_CAMPAIGN] = [];
const jobTemplate = campaigns[119][0];
for (const [index, demo] of demoRooms.entries()) {
  const roomName = `campaign_${DEMO_CAMPAIGN}interview~~${demo.email}~~${shortHash(demo.email)}`;
  rooms[roomName] = demo.segments(roomName, demo.startedAt);
  campaigns[DEMO_CAMPAIGN].push({
    ...clone(jobTemplate),
    roomName,
    campaignId: DEMO_CAMPAIGN,
    userId: 5900,
    candidateUserId: demo.name === null ? null : 5901 + index,
    candidateId: demo.name === null ? null : String(5901 + index),
    candidateName: demo.name,
    candidateEmail: demo.email,
    candidateDateCreated: `${demo.startedAt}+00:00`,
    campaignJobTitle: 'Mock scenarios (not live data)',
    analyticsCompleted: demo.completed,
    percentageAnalyticCompleted: demo.progress,
    campaign_assessment_video_link: [],
  });
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'campaigns.json'), `${JSON.stringify(campaigns, null, 2)}\n`);
writeFileSync(join(outDir, 'rooms.json'), `${JSON.stringify(rooms, null, 1)}\n`);

const segmentCount = Object.values(rooms).flat().length;
console.log(
  `Wrote ${Object.keys(campaigns).length} campaigns, ${Object.keys(rooms).length} rooms, ${segmentCount} segments.`,
);
