import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';

type FocusStage = 'world' | 'domain' | 'concept' | 'claim' | 'evidence';

interface EvidenceNode {
  id: string;
  label: string;
  type: string;
  note: string;
}

interface ClaimNode {
  id: string;
  label: string;
  summary: string;
  evidence: EvidenceNode[];
}

interface ConceptNode {
  id: string;
  label: string;
  summary: string;
  claims: ClaimNode[];
}

interface DomainNode {
  id: string;
  label: string;
  eyebrow: string;
  summary: string;
  tone: string;
  x: number;
  y: number;
  concepts: ConceptNode[];
}

interface GraphEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface PositionedNode<T> {
  item: T;
  x: number;
  y: number;
}

interface BreakdownCard {
  stage: string;
  title: string;
  summary: string;
  points: string[];
}

interface SystemCard {
  title: string;
  eyebrow: string;
  points: string[];
}

const createEvidence = (
  conceptId: string,
  claimId: string,
  entries: Array<{ type: string; label: string; note: string }>,
): EvidenceNode[] =>
  entries.map((entry, index) => ({
    id: `${conceptId}-${claimId}-e${index + 1}`,
    ...entry,
  }));

const createClaim = (
  conceptId: string,
  id: string,
  label: string,
  summary: string,
  evidence: Array<{ type: string; label: string; note: string }>,
): ClaimNode => ({
  id,
  label,
  summary,
  evidence: createEvidence(conceptId, id, evidence),
});

const createConcept = (
  id: string,
  label: string,
  summary: string,
  claims: ClaimNode[],
): ConceptNode => ({
  id,
  label,
  summary,
  claims,
});

const ATLAS_DOMAINS: DomainNode[] = [
  {
    id: 'education',
    label: 'Education',
    eyebrow: 'Formation',
    summary: 'Curriculum, pedagogy, and memory systems shape what a civilization can perceive.',
    tone: '#8ccf97',
    x: 36,
    y: 17,
    concepts: [
      createConcept(
        'education-curriculum-power',
        'Curriculum Power',
        'Syllabi decide which assumptions feel obvious before debate even begins.',
        [
          createClaim(
            'education-curriculum-power',
            'selection',
            'Selection decides legitimacy',
            'The canon is a filter for what a culture permits itself to call serious.',
            [
              {
                type: 'Institution',
                label: 'State curriculum standards',
                note: 'Official requirements elevate some texts while rendering others optional or invisible.',
              },
              {
                type: 'Timeline',
                label: 'Colonial schooling reforms',
                note: 'Administrative models often replaced inherited scholarly pathways with state-managed syllabi.',
              },
              {
                type: 'Scholar Quote',
                label: 'Formation precedes argument',
                note: 'What students repeat early becomes the frame through which later claims are judged.',
              },
            ],
          ),
          createClaim(
            'education-curriculum-power',
            'formation',
            'Habits often teach more than lectures',
            'Rituals of reading, testing, and ranking train posture toward truth.',
            [
              {
                type: 'Case',
                label: 'Exam-driven learning cultures',
                note: 'Assessment pressure can displace contemplation with performance logic.',
              },
              {
                type: 'Hadith',
                label: 'Knowledge tied to adab',
                note: 'Transmission in the Islamic tradition couples learning with discipline and comportment.',
              },
              {
                type: 'Observation',
                label: 'Classroom cadence',
                note: 'A room organized around compliance produces different kinds of knowing than one organized around witness.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'education-memory-tradition',
        'Memory and Transmission',
        'What a civilization remembers together becomes the continuity beneath its institutions.',
        [
          createClaim(
            'education-memory-tradition',
            'continuity',
            'Memory stabilizes civilizational identity',
            'Shared recitation, stories, and exemplars keep moral vocabularies alive across generations.',
            [
              {
                type: 'Verse',
                label: 'Qur\'anic remembrance motif',
                note: 'Repetition is framed not as redundancy but as preservation and awakening.',
              },
              {
                type: 'Historical Example',
                label: 'Ijazah chains',
                note: 'Authorization structures kept knowledge attached to people, not only documents.',
              },
              {
                type: 'Institution',
                label: 'Family teaching circles',
                note: 'Household-level repetition anchors identity before public institutions take over.',
              },
            ],
          ),
          createClaim(
            'education-memory-tradition',
            'forgetting',
            'Forgetting produces borrowed worlds',
            'A people without cultural memory becomes dependent on imported categories to explain itself.',
            [
              {
                type: 'Scholar Quote',
                label: 'Colonization of memory',
                note: 'The most durable conquest often occurs when a culture forgets how to name its own experience.',
              },
              {
                type: 'Case',
                label: 'Language loss',
                note: 'When classical vocabulary disappears, inherited distinctions become harder to recover.',
              },
              {
                type: 'Timeline',
                label: 'Post-imperial identity shifts',
                note: 'Institutional collapse often accelerates forgetting and category replacement.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'revelation',
    label: 'Revelation',
    eyebrow: 'Source',
    summary: 'Revelation frames reality as disclosed meaning rather than raw material awaiting invention.',
    tone: '#e8c96a',
    x: 50,
    y: 13,
    concepts: [
      createConcept(
        'revelation-scripture',
        'Scripture as Orientation',
        'Revelation does not merely add data; it rearranges the map of what counts as real and binding.',
        [
          createClaim(
            'revelation-scripture',
            'orientation',
            'Revelation names the world before the world names itself',
            'The text supplies categories, scale, and moral coordinates prior to institutional argument.',
            [
              {
                type: 'Verse',
                label: 'Guidance and criterion',
                note: 'The Qur\'an repeatedly presents itself as furqan: a criterion that clarifies difference.',
              },
              {
                type: 'Scholar Quote',
                label: 'Text as world-disclosure',
                note: 'Scripture is not only content but a lens through which phenomena are interpreted.',
              },
              {
                type: 'Case',
                label: 'Legal derivation',
                note: 'Normative reasoning in Islamic law begins from revealed speech, not autonomous social consensus.',
              },
            ],
          ),
          createClaim(
            'revelation-scripture',
            'resistance',
            'Revelation resists purely procedural neutrality',
            'It insists that moral order is not exhausted by administrative settlement.',
            [
              {
                type: 'Hadith',
                label: 'Truth over preference',
                note: 'Prophetic instruction repeatedly interrupts convenience when convenience conflicts with guidance.',
              },
              {
                type: 'Institution',
                label: 'Sacred time and ritual',
                note: 'Prayer, fasting, and pilgrimage order life by command rather than market rhythm.',
              },
              {
                type: 'Historical Example',
                label: 'Scriptural reform movements',
                note: 'Renewal projects often begin by returning institutions to revealed premises.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'revelation-prophecy',
        'Prophetic Authority',
        'The Prophet models how truth becomes embodied practice, leadership, and judgment.',
        [
          createClaim(
            'revelation-prophecy',
            'embodiment',
            'Prophecy turns doctrine into lived form',
            'The Sunnah demonstrates what revelation looks like when enacted in time.',
            [
              {
                type: 'Hadith',
                label: 'Embodied interpretation',
                note: 'Prophetic action clarifies what abstract command requires in concrete settings.',
              },
              {
                type: 'Case',
                label: 'Madinan order',
                note: 'The Prophetic city shows how worship, adjudication, and social life interlock.',
              },
              {
                type: 'Scholar Quote',
                label: 'Form and transmission',
                note: 'The Sunnah preserves not only rulings but patterns of proportion and priority.',
              },
            ],
          ),
          createClaim(
            'revelation-prophecy',
            'continuity',
            'Prophetic mediation preserves continuity between text and civilization',
            'Without Prophetic interpretation, revelation risks reduction into decontextualized fragments.',
            [
              {
                type: 'Institution',
                label: 'Hadith sciences',
                note: 'Transmission disciplines protect the bridge between revealed text and lived guidance.',
              },
              {
                type: 'Timeline',
                label: 'Classical juristic development',
                note: 'Schools of law grew by binding scripture to Prophetic explanation and method.',
              },
              {
                type: 'Observation',
                label: 'Fragment vs form',
                note: 'Detached textual snippets rarely produce civilizational coherence on their own.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'family',
    label: 'Family',
    eyebrow: 'Transmission',
    summary: 'The family is the first school of worldview, loyalty, language, and moral rhythm.',
    tone: '#d89cef',
    x: 64,
    y: 18,
    concepts: [
      createConcept(
        'family-kinship',
        'Kinship Order',
        'Family structures carry assumptions about duty, authority, and inheritance.',
        [
          createClaim(
            'family-kinship',
            'duty',
            'Kinship normalizes obligation before choice',
            'The family teaches that the self is born into responsibilities, not only preferences.',
            [
              {
                type: 'Verse',
                label: 'Rights of kin',
                note: 'The Qur\'an repeatedly ties righteousness to concrete family obligations.',
              },
              {
                type: 'Case',
                label: 'Eldercare expectations',
                note: 'Household obligations often reveal deeper anthropology than political slogans do.',
              },
              {
                type: 'Scholar Quote',
                label: 'The home as moral grammar',
                note: 'Early domestic life provides the first intuitive map of authority and mercy.',
              },
            ],
          ),
          createClaim(
            'family-kinship',
            'inheritance',
            'Inheritance encodes a civilization\'s moral mathematics',
            'Distribution rules reveal how a tradition understands justice, lineage, and continuity.',
            [
              {
                type: 'Law',
                label: 'Inheritance legislation',
                note: 'Legal formulas make visible assumptions about dependency and reciprocal duty.',
              },
              {
                type: 'Historical Example',
                label: 'Extended family estates',
                note: 'Older property patterns linked economic survival to kin-based continuity.',
              },
              {
                type: 'Comparison',
                label: 'Modern estate autonomy',
                note: 'Contemporary flexibility often shifts weight from duty to preference.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'family-transmission',
        'Transmission of Belonging',
        'Family life passes on symbols, speech habits, and unspoken notions of the good.',
        [
          createClaim(
            'family-transmission',
            'language',
            'Belonging is learned in the language of the home',
            'Accent, prayer, stories, and emotional memory are inherited before ideology is chosen.',
            [
              {
                type: 'Observation',
                label: 'Domestic ritual patterns',
                note: 'Meals, greetings, and prayer rhythms seed identity long before formal argument.',
              },
              {
                type: 'Institution',
                label: 'Intergenerational households',
                note: 'Shared domestic space thickens the transfer of embodied memory.',
              },
              {
                type: 'Case',
                label: 'Diaspora language attrition',
                note: 'When household vocabulary thins, worldview transmission often weakens with it.',
              },
            ],
          ),
          createClaim(
            'family-transmission',
            'pressure',
            'Family is where civilizational pressure becomes intimate',
            'Political and economic shifts often first register inside domestic expectations.',
            [
              {
                type: 'Timeline',
                label: 'Industrial work rhythms',
                note: 'Modern schedules restructured who could be present for formation inside the home.',
              },
              {
                type: 'Media',
                label: 'Platform-mediated parenting',
                note: 'Screens increasingly compete with elders as the first interpreters of reality.',
              },
              {
                type: 'Scholar Quote',
                label: 'Intimacy under pressure',
                note: 'A civilization reveals its stress fractures in the family before it admits them publicly.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'law',
    label: 'Law',
    eyebrow: 'Order',
    summary: 'Law translates a civilization\'s metaphysics into public claims about justice, neutrality, and force.',
    tone: '#d9b56f',
    x: 77,
    y: 28,
    concepts: [
      createConcept(
        'law-secularism',
        'Secularism',
        'Secular law often presents itself as neutral while quietly carrying substantive moral commitments.',
        [
          createClaim(
            'law-secularism',
            'neutrality',
            'Modern law presents itself as neutral',
            'Procedure can disguise contested assumptions by naming them merely administrative or universal.',
            [
              {
                type: 'Scholar Quote',
                label: 'Neutrality as posture',
                note: 'Claims of neutrality often move substantive commitments into the invisible background.',
              },
              {
                type: 'Law',
                label: 'Constitutional language',
                note: 'Rights discourse tends to describe its own frame as self-evident rather than inherited.',
              },
              {
                type: 'Historical Example',
                label: 'Colonial legal transfer',
                note: 'Imported legal codes frequently arrived under the language of rational administration.',
              },
            ],
          ),
          createClaim(
            'law-secularism',
            'metaphysics',
            'Procedure still rests on metaphysical commitments',
            'Every legal system decides what a person is, what harm means, and what counts as public reason.',
            [
              {
                type: 'Verse',
                label: 'Judgment and trust',
                note: 'Revelation frames judgment as accountable before God, not only before institutions.',
              },
              {
                type: 'Institutional Case',
                label: 'Religious symbols litigation',
                note: 'Supposedly neutral public space still encodes a preferred anthropology.',
              },
              {
                type: 'Timeline',
                label: 'Rise of administrative states',
                note: 'Bureaucratic expansion often shifted moral decisions into procedural language.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'law-sovereignty',
        'Sovereignty',
        'Who gets to define the binding center of judgment determines the architecture of public life.',
        [
          createClaim(
            'law-sovereignty',
            'source',
            'Sovereignty answers the question of final authorship',
            'The highest authority in law tells us where a civilization locates ultimacy.',
            [
              {
                type: 'Law',
                label: 'Legislative supremacy doctrines',
                note: 'Modern systems frequently center lawmaking in the state as final arbiter.',
              },
              {
                type: 'Scholar Quote',
                label: 'Finality and ultimacy',
                note: 'Every sovereign claim is also a theological statement about who may bind conscience.',
              },
              {
                type: 'Historical Example',
                label: 'Post-caliphal transitions',
                note: 'Changes in political form reordered how legal authority was justified and perceived.',
              },
            ],
          ),
          createClaim(
            'law-sovereignty',
            'constraint',
            'Constraint distinguishes authority from domination',
            'A lawful order must explain what limits the center, not only what empowers it.',
            [
              {
                type: 'Hadith',
                label: 'No obedience in disobedience',
                note: 'Prophetic teaching places principled limits on worldly command.',
              },
              {
                type: 'Case',
                label: 'Emergency powers',
                note: 'Moments of crisis reveal what a system truly treats as untouchable.',
              },
              {
                type: 'Comparison',
                label: 'Rule by exception',
                note: 'Unbounded exceptions often expose the fragility of claims to neutrality.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'power',
    label: 'Power',
    eyebrow: 'Command',
    summary: 'Power reveals how a civilization imagines force, legitimacy, and the right to shape reality.',
    tone: '#ab8cff',
    x: 83,
    y: 44,
    concepts: [
      createConcept(
        'power-legitimacy',
        'Legitimacy',
        'Power endures when it persuades people that its order is normal, inevitable, or righteous.',
        [
          createClaim(
            'power-legitimacy',
            'narrative',
            'Narrative stabilizes coercion',
            'Successful regimes pair force with stories that make that force feel necessary.',
            [
              {
                type: 'Media',
                label: 'Security narrative',
                note: 'Language of safety often legitimizes otherwise exceptional forms of control.',
              },
              {
                type: 'Historical Example',
                label: 'Imperial civilizing missions',
                note: 'Dominance is commonly narrated as reform, peace, or uplift.',
              },
              {
                type: 'Scholar Quote',
                label: 'Power needs grammar',
                note: 'Rule lasts longer when it becomes the default language of plausibility.',
              },
            ],
          ),
          createClaim(
            'power-legitimacy',
            'visibility',
            'Visible force matters less than accepted authority',
            'People often comply not because coercion is constant but because legitimacy has been internalized.',
            [
              {
                type: 'Institution',
                label: 'Administrative compliance',
                note: 'Routine paperwork can govern more efficiently than dramatic shows of force.',
              },
              {
                type: 'Case',
                label: 'Emergency normalization',
                note: 'Temporary measures become stable once absorbed into ordinary expectations.',
              },
              {
                type: 'Observation',
                label: 'Social self-policing',
                note: 'Cultures of surveillance often persist through mutual conformity rather than visible punishment.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'power-empire',
        'Empire',
        'Empire extends a center outward while teaching peripheral peoples to read the world through that center.',
        [
          createClaim(
            'power-empire',
            'translation',
            'Empire translates itself into universality',
            'Imperial power often frames its own worldview as merely human, modern, or objective.',
            [
              {
                type: 'Timeline',
                label: 'Global administrative standardization',
                note: 'Empire scales itself by standardizing language, law, and education.',
              },
              {
                type: 'Comparison',
                label: 'Center and periphery',
                note: 'The imperial center names its norms neutral while provincializing alternatives.',
              },
              {
                type: 'Scholar Quote',
                label: 'Universalism and power',
                note: 'The universal is often where particular power forgets its own locality.',
              },
            ],
          ),
          createClaim(
            'power-empire',
            'memory',
            'Empire persists after armies leave',
            'Its deepest victories remain in categories, aspiration, and institutional mimicry.',
            [
              {
                type: 'Case',
                label: 'Postcolonial bureaucracy',
                note: 'Administrative structures frequently outlive the empires that created them.',
              },
              {
                type: 'Education',
                label: 'Imported elite formation',
                note: 'Leadership classes often inherit imperial assumptions through prestigious schooling.',
              },
              {
                type: 'Observation',
                label: 'Aspirational mimicry',
                note: 'Prestige can preserve imperial norms even without direct occupation.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    eyebrow: 'Epistemology',
    summary: 'Knowledge determines what may count as evidence, authority, and credible explanation.',
    tone: '#7ebdf8',
    x: 79,
    y: 61,
    concepts: [
      createConcept(
        'knowledge-epistemology',
        'Epistemic Authority',
        'Every knowledge order privileges certain witnesses, methods, and institutions over others.',
        [
          createClaim(
            'knowledge-epistemology',
            'method',
            'Method is never innocent',
            'Methods encode prior decisions about what the world is and how it may be approached.',
            [
              {
                type: 'Scholar Quote',
                label: 'Method as metaphysics',
                note: 'A method is already a wager about the nature of reality and proof.',
              },
              {
                type: 'Institution',
                label: 'Peer review gatekeeping',
                note: 'Institutions often decide credibility before individual arguments are heard.',
              },
              {
                type: 'Comparison',
                label: 'Isnad and citation',
                note: 'Different traditions test reliability through different architectures of trust.',
              },
            ],
          ),
          createClaim(
            'knowledge-epistemology',
            'authority',
            'Authority gathers around credentialed interpreters',
            'Modern knowledge ecosystems centralize trust through professional certification and expert networks.',
            [
              {
                type: 'Case',
                label: 'Expert consensus regimes',
                note: 'Disagreement is often managed by narrowing who gets to count as an expert.',
              },
              {
                type: 'Historical Example',
                label: 'Rise of the modern university',
                note: 'Institutional concentration reorganized access to legitimacy and publication.',
              },
              {
                type: 'Observation',
                label: 'Platform amplification',
                note: 'Visibility increasingly determines what authority feels immediate and real.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'knowledge-classification',
        'Classification',
        'Categories determine what can be noticed, compared, and acted upon.',
        [
          createClaim(
            'knowledge-classification',
            'taxonomy',
            'Taxonomy shapes perception',
            'The map of categories often decides what questions even seem available.',
            [
              {
                type: 'Institution',
                label: 'Disciplinary silos',
                note: 'Fields of study create conceptual borders that can conceal integrated realities.',
              },
              {
                type: 'Scholar Quote',
                label: 'Naming as governance',
                note: 'To classify is already to govern attention and significance.',
              },
              {
                type: 'Case',
                label: 'Secular/religious split',
                note: 'Some binary divisions are historical artifacts that later present themselves as natural.',
              },
            ],
          ),
          createClaim(
            'knowledge-classification',
            'retrieval',
            'Classification determines retrieval',
            'What cannot be indexed cleanly often disappears from ordinary thought.',
            [
              {
                type: 'Media',
                label: 'Search ranking logic',
                note: 'Digital retrieval systems increasingly determine what appears authoritative first.',
              },
              {
                type: 'Timeline',
                label: 'Archive standardization',
                note: 'Administrative filing systems transformed which kinds of knowledge scaled well.',
              },
              {
                type: 'Observation',
                label: 'Metadata as worldview',
                note: 'Tags, filters, and fields quietly teach users how a system sees reality.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'society',
    label: 'Society',
    eyebrow: 'Belonging',
    summary: 'Society mediates between private life and public order through norms, institutions, and shared myths.',
    tone: '#5fd3bc',
    x: 64,
    y: 74,
    concepts: [
      createConcept(
        'society-social-contract',
        'Social Contract',
        'Modern social theory often imagines society as a negotiated pact among autonomous selves.',
        [
          createClaim(
            'society-social-contract',
            'fiction',
            'Contract imagery hides inherited bonds',
            'People enter public life already shaped by language, family, and moral tradition.',
            [
              {
                type: 'Scholar Quote',
                label: 'The unchosen background',
                note: 'Autonomous agreement is built upon many prior inheritances that were never negotiated.',
              },
              {
                type: 'Case',
                label: 'Civic fragmentation',
                note: 'Thin contractual identities can struggle to hold during periods of stress.',
              },
              {
                type: 'Comparison',
                label: 'Ummah vs contract',
                note: 'Religious belonging frames social unity in thicker terms than procedural agreement alone.',
              },
            ],
          ),
          createClaim(
            'society-social-contract',
            'maintenance',
            'Contracts still require virtue to survive',
            'Even procedural orders depend on trust, restraint, and shared moral assumptions.',
            [
              {
                type: 'Institution',
                label: 'Courts and civic trust',
                note: 'Institutions function differently where moral trust has already eroded.',
              },
              {
                type: 'Observation',
                label: 'Shared norms beneath rights',
                note: 'Rights language presumes habits of mutual recognition it cannot generate by itself.',
              },
              {
                type: 'Historical Example',
                label: 'Periods of social breakdown',
                note: 'When trust collapses, formal structures alone rarely restore common life quickly.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'society-public-virtue',
        'Public Virtue',
        'A society needs moral texture in public, not only tolerance in procedure.',
        [
          createClaim(
            'society-public-virtue',
            'visibility',
            'Virtue must be socially visible to be imitated',
            'Norms survive when goodness has public shape, not merely private preference.',
            [
              {
                type: 'Case',
                label: 'Neighborhood rituals',
                note: 'Shared practices often preserve moral continuity more effectively than formal campaigns.',
              },
              {
                type: 'Media',
                label: 'Prestige signaling',
                note: 'What a society celebrates publicly becomes its unofficial catechism.',
              },
              {
                type: 'Observation',
                label: 'Embodied example',
                note: 'People imitate visible forms of dignity faster than abstract advice.',
              },
            ],
          ),
          createClaim(
            'society-public-virtue',
            'erosion',
            'Private morality cannot indefinitely carry a disordered public culture',
            'Institutions and atmospheres eventually train desire back onto the household.',
            [
              {
                type: 'Timeline',
                label: 'Normalization cycles',
                note: 'Repeated exposure alters what later generations experience as obvious.',
              },
              {
                type: 'Family',
                label: 'Household spillover',
                note: 'Public vice tends to migrate inward through speech, entertainment, and aspiration.',
              },
              {
                type: 'Scholar Quote',
                label: 'Culture as pedagogy',
                note: 'Every public order is teaching, whether or not it admits that it is.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'civilization',
    label: 'Civilization',
    eyebrow: 'Scale',
    summary: 'Civilization is the long-form arrangement of knowledge, architecture, law, and memory.',
    tone: '#dbc48a',
    x: 48,
    y: 79,
    concepts: [
      createConcept(
        'civilization-confidence',
        'Civilizational Confidence',
        'A living civilization acts as if it has something worth preserving, extending, and offering.',
        [
          createClaim(
            'civilization-confidence',
            'self-understanding',
            'Confidence depends on intelligible self-understanding',
            'A civilization loses initiative when it can no longer narrate its own purpose coherently.',
            [
              {
                type: 'Historical Example',
                label: 'Periods of renewal',
                note: 'Revival movements often begin with recovered confidence in inherited categories.',
              },
              {
                type: 'Scholar Quote',
                label: 'Narration and agency',
                note: 'A people acts differently once it can describe itself without borrowing its opponent\'s map.',
              },
              {
                type: 'Institution',
                label: 'Civilizational education',
                note: 'Schools that teach continuity shape different horizons than schools that teach rupture.',
              },
            ],
          ),
          createClaim(
            'civilization-confidence',
            'beauty',
            'Beauty is a civilizational argument',
            'Architecture, calligraphy, and public ritual persuade people that order can be meaningful and lovely.',
            [
              {
                type: 'Case',
                label: 'Sacred architecture',
                note: 'Built form can teach permanence, proportion, and reverence without speaking.',
              },
              {
                type: 'Observation',
                label: 'Urban texture',
                note: 'Cities reveal civilizational priorities through what they make easy, visible, and admirable.',
              },
              {
                type: 'Comparison',
                label: 'Utility vs transcendence',
                note: 'Public aesthetics often expose deeper differences in what a culture values.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'civilization-renewal',
        'Decline and Renewal',
        'Civilizations decay when forms remain while meaning and confidence drain out of them.',
        [
          createClaim(
            'civilization-renewal',
            'drift',
            'Decline often appears first as drift, not collapse',
            'Institutions can survive materially while their animating purpose quietly thins.',
            [
              {
                type: 'Timeline',
                label: 'Late-form stagnation',
                note: 'Civilizations often persist externally while losing interior clarity.',
              },
              {
                type: 'Scholar Quote',
                label: 'Forms without spirit',
                note: 'Structures endure longer than the conviction that once made them luminous.',
              },
              {
                type: 'Case',
                label: 'Ceremonial continuity',
                note: 'Ritual can continue even as belief in its meaning weakens.',
              },
            ],
          ),
          createClaim(
            'civilization-renewal',
            'renewal',
            'Renewal reconnects institutions to first principles',
            'Revival is not nostalgia; it is a disciplined return to the sources of coherence.',
            [
              {
                type: 'Verse',
                label: 'Renewal through remembrance',
                note: 'Reform in revelation begins by returning to what was forgotten or neglected.',
              },
              {
                type: 'Historical Example',
                label: 'Scholarly reform networks',
                note: 'Renewal often scales through teaching circles before it reaches institutions.',
              },
              {
                type: 'Observation',
                label: 'Source-return',
                note: 'Living traditions renew by deepening their roots, not by erasing them.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'modernity',
    label: 'Modernity',
    eyebrow: 'Narrative',
    summary: 'Modernity tells a story about progress, emancipation, and the self-making individual.',
    tone: '#9ca3ff',
    x: 33,
    y: 73,
    concepts: [
      createConcept(
        'modernity-progress',
        'Progress Myth',
        'Modernity often treats history as an ascent away from superstition toward enlightened autonomy.',
        [
          createClaim(
            'modernity-progress',
            'direction',
            'Progress supplies a moral direction to history',
            'Temporal development becomes a substitute for metaphysical judgment.',
            [
              {
                type: 'Scholar Quote',
                label: 'History as salvation story',
                note: 'Modern narratives often repurpose religious structure into secular progress.',
              },
              {
                type: 'Timeline',
                label: 'Development indices',
                note: 'Measures of advancement frequently privilege one civilizational model as universal.',
              },
              {
                type: 'Comparison',
                label: 'Tradition as backwardness',
                note: 'Inherited forms are often judged by their distance from modern norms.',
              },
            ],
          ),
          createClaim(
            'modernity-progress',
            'cost',
            'Progress language conceals losses',
            'What is gained in efficiency may be accompanied by moral, communal, or spiritual erosion.',
            [
              {
                type: 'Case',
                label: 'Industrial alienation',
                note: 'Technological advance can simultaneously deepen fragmentation and loneliness.',
              },
              {
                type: 'Observation',
                label: 'Acceleration fatigue',
                note: 'A culture organized around constant innovation often struggles to preserve contemplation.',
              },
              {
                type: 'Scholar Quote',
                label: 'Speed and soul',
                note: 'Not every increase in power is an increase in wisdom.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'modernity-autonomy',
        'Individual Autonomy',
        'The sovereign individual becomes the modern center of moral and political legitimacy.',
        [
          createClaim(
            'modernity-autonomy',
            'self',
            'Autonomy recasts the self as author',
            'The modern subject increasingly experiences freedom as self-definition unbound by inherited order.',
            [
              {
                type: 'Law',
                label: 'Expressive rights jurisprudence',
                note: 'Legal language often protects self-creation as a core public good.',
              },
              {
                type: 'Media',
                label: 'Identity performance',
                note: 'Digital culture rewards constant self-curation and public authorship.',
              },
              {
                type: 'Comparison',
                label: 'Submission vs self-authorship',
                note: 'Islamic anthropology frames flourishing through alignment, not self-originated ultimacy.',
              },
            ],
          ),
          createClaim(
            'modernity-autonomy',
            'limits',
            'Autonomy still depends on hidden supports',
            'Even radical individualism relies on inherited institutions, language, and social trust.',
            [
              {
                type: 'Family',
                label: 'Dependency structures',
                note: 'The autonomous self is produced inside networks it did not create.',
              },
              {
                type: 'Institution',
                label: 'Welfare and infrastructure',
                note: 'Freedom is made possible by shared systems that remain morally contested.',
              },
              {
                type: 'Observation',
                label: 'The hidden commons',
                note: 'Modern independence often consumes goods generated by non-autonomous forms of life.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'morality',
    label: 'Morality',
    eyebrow: 'Norms',
    summary: 'Morality names what a culture permits, esteems, forbids, and celebrates.',
    tone: '#ff947d',
    x: 20,
    y: 61,
    concepts: [
      createConcept(
        'morality-consensus',
        'Moral Consensus',
        'Modern societies often seek shared norms without appealing to a shared sacred source.',
        [
          createClaim(
            'morality-consensus',
            'thinness',
            'Consensus without transcendence tends toward thin norms',
            'The fewer shared foundations remain, the more morality reduces to procedural coexistence.',
            [
              {
                type: 'Case',
                label: 'Lowest-common-denominator ethics',
                note: 'Public morality often shrinks to what can be universally tolerated rather than what is good.',
              },
              {
                type: 'Scholar Quote',
                label: 'Procedural morality',
                note: 'When goods are contested, procedure begins to impersonate virtue.',
              },
              {
                type: 'Observation',
                label: 'Moral exhaustion',
                note: 'A culture can become fluent in rights while losing fluency in purpose.',
              },
            ],
          ),
          createClaim(
            'morality-consensus',
            'contestation',
            'Consensus is unstable when the sacred is displaced',
            'Conflicts intensify when deep differences remain but no shared source can adjudicate them.',
            [
              {
                type: 'Media',
                label: 'Permanent outrage cycles',
                note: 'Moral conflict becomes theatrical when institutions cannot resolve deeper disagreements.',
              },
              {
                type: 'Law',
                label: 'Court-centered morality',
                note: 'Judges are often forced to settle questions that cultures have not resolved metaphysically.',
              },
              {
                type: 'Comparison',
                label: 'Sacred adjudication',
                note: 'Traditions with transcendent reference points distribute moral authority differently.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'morality-formation',
        'Moral Formation',
        'Moral life is trained through repetition, exemplars, and atmosphere before it is argued abstractly.',
        [
          createClaim(
            'morality-formation',
            'habit',
            'Habit precedes conviction',
            'People usually become the kind of person who can recognize the good before they can define it well.',
            [
              {
                type: 'Hadith',
                label: 'Character refinement',
                note: 'The Prophetic model treats discipline of the soul as a practiced path.',
              },
              {
                type: 'Case',
                label: 'Institutional culture',
                note: 'Moral climates in schools and workplaces shape conduct beyond formal policy.',
              },
              {
                type: 'Observation',
                label: 'Repeated gestures',
                note: 'Small daily practices accumulate into durable intuitions of decency.',
              },
            ],
          ),
          createClaim(
            'morality-formation',
            'prestige',
            'Prestige often outruns principle',
            'A society imitates what it admires even when its official ethics say otherwise.',
            [
              {
                type: 'Media',
                label: 'Celebrity moral formation',
                note: 'Prestige systems quietly tutor desire and aspiration.',
              },
              {
                type: 'Scholar Quote',
                label: 'Admiration as pedagogy',
                note: 'What a culture honors repeatedly becomes one of its deepest teachers.',
              },
              {
                type: 'Observation',
                label: 'Symbolic rewards',
                note: 'Awards, influence, and public attention signal what counts as a life worth wanting.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'human-nature',
    label: 'Human Nature',
    eyebrow: 'Anthropology',
    summary: 'Human nature decides whether the self is received, disciplined, expressive, fallen, or perfectible.',
    tone: '#e7b46c',
    x: 17,
    y: 44,
    concepts: [
      createConcept(
        'human-nature-selfhood',
        'Selfhood',
        'Anthropology determines whether the self is discovered, authored, disciplined, or surrendered.',
        [
          createClaim(
            'human-nature-selfhood',
            'fitrah',
            'Fitrah frames the self as received before it is chosen',
            'The person begins with created orientation, not blank indeterminacy.',
            [
              {
                type: 'Hadith',
                label: 'Every child upon fitrah',
                note: 'Islamic anthropology begins with a primordial orientation toward truth.',
              },
              {
                type: 'Comparison',
                label: 'Blank slate vs nature',
                note: 'Different traditions interpret freedom differently depending on the starting anthropology.',
              },
              {
                type: 'Observation',
                label: 'Moral intuition',
                note: 'Many people experience conscience as recognition rather than invention.',
              },
            ],
          ),
          createClaim(
            'human-nature-selfhood',
            'construction',
            'Modern identity often treats the self as project',
            'The self becomes something to assemble, brand, and revise continuously.',
            [
              {
                type: 'Media',
                label: 'Profile culture',
                note: 'Platforms train people to treat identity as permanent public editing.',
              },
              {
                type: 'Law',
                label: 'Recognition regimes',
                note: 'Institutional legitimacy increasingly centers self-declared identity claims.',
              },
              {
                type: 'Scholar Quote',
                label: 'Project-self',
                note: 'A project-self can struggle to rest because completion is always deferred.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'human-nature-desire',
        'Desire and Discipline',
        'Every worldview answers whether desire should be obeyed, optimized, or trained.',
        [
          createClaim(
            'human-nature-desire',
            'discipline',
            'Discipline gives desire a moral horizon',
            'Traditions of restraint seek not negation of desire but its right ordering.',
            [
              {
                type: 'Verse',
                label: 'Tazkiyah and restraint',
                note: 'Purification assumes desire can be refined and directed rather than merely expressed.',
              },
              {
                type: 'Practice',
                label: 'Fasting',
                note: 'Embodied worship teaches mastery, not annihilation, of appetite.',
              },
              {
                type: 'Observation',
                label: 'Desire under training',
                note: 'People often report freedom through mastery rather than indulgence.',
              },
            ],
          ),
          createClaim(
            'human-nature-desire',
            'liberation',
            'Liberated desire can become a new discipline of its own',
            'What looks like freedom may still be shaped by markets, prestige, and algorithms.',
            [
              {
                type: 'Media',
                label: 'Algorithmic desire shaping',
                note: 'Recommendation systems train appetite while presenting themselves as responsive.',
              },
              {
                type: 'Case',
                label: 'Consumer identity loops',
                note: 'Markets monetize self-expression and then teach what self-expression should look like.',
              },
              {
                type: 'Comparison',
                label: 'Freedom and formation',
                note: 'The key question is not whether desire is shaped, but by whom and toward what.',
              },
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: 'media',
    label: 'Media',
    eyebrow: 'Attention',
    summary: 'Media determines what becomes visible, urgent, memorable, and emotionally credible.',
    tone: '#7eb8ff',
    x: 23,
    y: 27,
    concepts: [
      createConcept(
        'media-narrative-control',
        'Narrative Control',
        'Media does not merely deliver stories; it organizes the field of what can be publicly imagined.',
        [
          createClaim(
            'media-narrative-control',
            'agenda',
            'Agenda-setting precedes persuasion',
            'The first power of media is deciding which realities must be discussed at all.',
            [
              {
                type: 'Case',
                label: 'Editorial framing',
                note: 'The selection of headlines often matters more than the argument inside them.',
              },
              {
                type: 'Observation',
                label: 'Attention scarcity',
                note: 'What is repeated becomes public reality faster than what is merely true.',
              },
              {
                type: 'Scholar Quote',
                label: 'Visibility as authority',
                note: 'In mediated environments, appearing central often substitutes for being central.',
              },
            ],
          ),
          createClaim(
            'media-narrative-control',
            'mood',
            'Media transmits mood as much as information',
            'Atmosphere, fear, urgency, and irony often carry worldview more effectively than explicit doctrine.',
            [
              {
                type: 'Media',
                label: 'Visual tone and soundtrack',
                note: 'Aesthetics often guide interpretation before content is processed propositionally.',
              },
              {
                type: 'Case',
                label: 'Breaking-news dramaturgy',
                note: 'Formats of urgency train audiences to inhabit permanent crisis.',
              },
              {
                type: 'Observation',
                label: 'Ironic distance',
                note: 'Some media cultures make seriousness itself harder to sustain.',
              },
            ],
          ),
        ],
      ),
      createConcept(
        'media-attention-economies',
        'Attention Economies',
        'Platforms compete to capture, hold, and monetize human focus.',
        [
          createClaim(
            'media-attention-economies',
            'capture',
            'Captured attention reshapes the self',
            'What a person repeatedly attends to becomes part of their moral and imaginative architecture.',
            [
              {
                type: 'Observation',
                label: 'Fragmented focus',
                note: 'Attention fragmentation makes sustained contemplation more difficult.',
              },
              {
                type: 'Case',
                label: 'Infinite scroll design',
                note: 'Platform structure rewards continued presence more than truthful depth.',
              },
              {
                type: 'Comparison',
                label: 'Dhikr vs drift',
                note: 'Traditions of remembrance cultivate attention differently than engagement platforms do.',
              },
            ],
          ),
          createClaim(
            'media-attention-economies',
            'market',
            'Attention markets privilege intensity over wisdom',
            'What provokes reaction often outruns what deserves trust.',
            [
              {
                type: 'Media',
                label: 'Engagement ranking',
                note: 'Outrage and novelty scale more reliably than nuance.',
              },
              {
                type: 'Scholar Quote',
                label: 'The market of notice',
                note: 'Markets reward what is repeatable and monetizable, not necessarily what is formative.',
              },
              {
                type: 'Observation',
                label: 'Noise as default',
                note: 'Without deliberate design, digital atmospheres trend toward cognitive overcrowding.',
              },
            ],
          ),
        ],
      ),
    ],
  },
];

const BREAKDOWN_CARDS: BreakdownCard[] = [
  {
    stage: '01',
    title: 'World',
    summary: 'A living globe of domains introduces the civilizational field before details arrive.',
    points: [
      'Only major worldview domains stay permanently labeled.',
      'Constellation lines reveal the shape of the whole without turning chaotic.',
      'The first reading is atmosphere, scale, and orientation.',
    ],
  },
  {
    stage: '02',
    title: 'Domain',
    summary: 'Selecting a region dims the wider atlas and brings that civilizational cluster into focus.',
    points: [
      'The chosen domain becomes the visual anchor.',
      'Concept nodes appear around it in a curated orbit.',
      'The panel shifts from poetic overview into structured research framing.',
    ],
  },
  {
    stage: '03',
    title: 'Concept',
    summary: 'A concept becomes the chamber where a worldview can be stated crisply before argument expands.',
    points: [
      'The concept is centered and enlarged.',
      'Claims are hinted as the next ring rather than dumped all at once.',
      'Users understand what is being examined before evidence begins.',
    ],
  },
  {
    stage: '04',
    title: 'Claim',
    summary: 'Claims emerge as interpretable argument nodes, not floating labels without hierarchy.',
    points: [
      'Each claim clarifies a proposition the worldview makes.',
      'Claims stay close to the selected concept so reasoning feels contained.',
      'The graph reads like structured thought, not ambient decoration.',
    ],
  },
  {
    stage: '05',
    title: 'Evidence',
    summary: 'Evidence anchors the argument with citations, cases, revelation, and institutional examples.',
    points: [
      'Evidence appears as smaller anchor nodes orbiting the chosen claim.',
      'The side panel becomes a research surface with structured notes.',
      'Proof supports the graph rather than crowding it.',
    ],
  },
];

const MOTION_STEPS = [
  'Open in near-black with distant particulate glow and a slow-breathing field.',
  'Reveal the spherical atlas shell before any labels fully resolve.',
  'Trace inter-domain lines with staggered, almost cartographic light.',
  'Let domain nodes materialize one by one with deliberate timing, not a mass pop-in.',
  'Dim the global field on focus so the camera feels like it is descending into one region.',
  'Bring concept nodes in on a tighter orbit with increased text clarity and reduced noise.',
  'Hold the concept alone for a beat before claims arrive, preserving hierarchy.',
  'Expose claims in a precise ring, then let evidence anchor beneath the chosen argument.',
];

const SYSTEM_CARDS: SystemCard[] = [
  {
    eyebrow: 'UI Breakdown',
    title: 'Section-by-section structure',
    points: [
      'Full-screen hero graph first, with minimal top chrome and a right-side research panel.',
      'Atlas logic sections follow below the fold: layers, motion, style system, schema, premium rules.',
      'Home remains a separate second step reached only after the prologue.',
    ],
  },
  {
    eyebrow: 'Style System',
    title: 'Visual language',
    points: [
      'Palette: obsidian, graphite, muted indigo, bronze-gold, and restrained tonal accents per domain.',
      'Typography: Cinzel for monumental headings, EB Garamond for research voice, body text kept quiet.',
      'Chrome: thin borders, deep glass surfaces, soft glows, subtle blur, and disciplined whitespace.',
    ],
  },
  {
    eyebrow: 'Graph Guidance',
    title: 'Node hierarchy rules',
    points: [
      'Domains are largest and always labeled in world view.',
      'Concepts surface only when a domain is selected; claims appear only after concept focus.',
      'Evidence stays smallest and most grounded, acting as support rather than spectacle.',
    ],
  },
  {
    eyebrow: 'Premium Guardrails',
    title: 'Keep the desktop experience clean',
    points: [
      'Never let every label show simultaneously; privilege focus over completeness.',
      'Use motion to direct attention, not to show off the graph engine.',
      'Reserve strong glow for active nodes so the page keeps its cinematic restraint.',
    ],
  },
];

const SCHEMA_SAMPLE = `type AtlasNode =
  | { kind: 'domain'; id: string; label: string; tone: string; summary: string; }
  | { kind: 'concept'; id: string; parent: string; label: string; summary: string; }
  | { kind: 'claim'; id: string; parent: string; label: string; summary: string; polarity?: 'core' | 'tension'; }
  | { kind: 'evidence'; id: string; parent: string; evidenceType: 'quote' | 'law' | 'verse' | 'hadith' | 'case' | 'timeline'; label: string; note: string; };

type AtlasEdge = {
  source: string;
  target: string;
  relation: 'contains' | 'supports' | 'contrasts' | 'echoes';
  weight: number;
};`;

@Component({
  selector: 'km-atlas-landing',
  standalone: true,
  imports: [],
  templateUrl: './atlas-landing.component.html',
  styleUrl: './atlas-landing.component.scss',
})
export class AtlasLandingComponent implements AfterViewInit {
  private readonly router = inject(Router);

  @ViewChild('hero') heroRef!: ElementRef<HTMLElement>;
  @ViewChild('graphFrame') graphFrameRef!: ElementRef<HTMLElement>;
  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLElement>;

  readonly stage = signal<FocusStage>('world');
  readonly selectedDomain = signal<DomainNode | null>(null);
  readonly selectedConcept = signal<ConceptNode | null>(null);
  readonly selectedClaim = signal<ClaimNode | null>(null);

  readonly particles = Array.from({ length: 44 }, (_, index) => index);
  readonly domains = ATLAS_DOMAINS;
  readonly breakdownCards = BREAKDOWN_CARDS;
  readonly motionSteps = MOTION_STEPS;
  readonly systemCards = SYSTEM_CARDS;
  readonly schemaSample = SCHEMA_SAMPLE;

  readonly atlasCounts = computed(() => {
    const conceptCount = this.domains.reduce((total, domain) => total + domain.concepts.length, 0);
    const claimCount = this.domains.reduce(
      (total, domain) =>
        total + domain.concepts.reduce((conceptTotal, concept) => conceptTotal + concept.claims.length, 0),
      0,
    );
    const evidenceCount = this.domains.reduce(
      (total, domain) =>
        total +
        domain.concepts.reduce(
          (conceptTotal, concept) =>
            conceptTotal +
            concept.claims.reduce((claimTotal, claim) => claimTotal + claim.evidence.length, 0),
          0,
        ),
      0,
    );
    return {
      domains: this.domains.length,
      concepts: conceptCount,
      claims: claimCount,
      evidence: evidenceCount,
    };
  });

  readonly conceptNodes = computed(() =>
    this.positionNodes(this.selectedDomain()?.concepts ?? [], 50, 50, 22, -94),
  );

  readonly claimNodes = computed(() =>
    this.positionNodes(this.selectedConcept()?.claims ?? [], 50, 49, 19, -92),
  );

  readonly evidenceNodes = computed(() =>
    this.positionArc(this.selectedClaim()?.evidence ?? [], 50, 67, 17, 210, 330),
  );

  readonly worldEdges = computed(() => {
    const sequence = [
      'education',
      'revelation',
      'family',
      'law',
      'power',
      'knowledge',
      'society',
      'civilization',
      'modernity',
      'morality',
      'human-nature',
      'media',
    ];

    const edges: GraphEdge[] = [];
    sequence.forEach((id, index) => {
      const current = this.findDomain(id);
      const next = this.findDomain(sequence[(index + 1) % sequence.length]);
      if (current && next) {
        edges.push(this.lineFor(`loop-${id}-${next.id}`, current.x, current.y, next.x, next.y));
      }
    });

    [
      ['revelation', 'law'],
      ['revelation', 'civilization'],
      ['law', 'morality'],
      ['knowledge', 'media'],
      ['family', 'society'],
      ['power', 'modernity'],
      ['education', 'knowledge'],
    ].forEach(([sourceId, targetId]) => {
      const source = this.findDomain(sourceId);
      const target = this.findDomain(targetId);
      if (source && target) {
        edges.push(this.lineFor(`cross-${sourceId}-${targetId}`, source.x, source.y, target.x, target.y));
      }
    });

    return edges;
  });

  readonly domainEdges = computed(() =>
    this.conceptNodes().map((conceptNode) =>
      this.lineFor(
        `domain-${conceptNode.item.id}`,
        50,
        50,
        conceptNode.x,
        conceptNode.y,
      ),
    ),
  );

  readonly conceptEdges = computed(() =>
    this.claimNodes().map((claimNode) =>
      this.lineFor(
        `concept-${claimNode.item.id}`,
        50,
        49,
        claimNode.x,
        claimNode.y,
      ),
    ),
  );

  readonly evidenceEdges = computed(() =>
    this.evidenceNodes().map((evidenceNode) =>
      this.lineFor(
        `evidence-${evidenceNode.item.id}`,
        50,
        46,
        evidenceNode.x,
        evidenceNode.y,
      ),
    ),
  );

  readonly breadcrumbLabels = computed(() => {
    const labels = ['World'];
    if (this.selectedDomain()) labels.push(this.selectedDomain()!.label);
    if (this.selectedConcept()) labels.push(this.selectedConcept()!.label);
    if (this.selectedClaim()) labels.push(this.selectedClaim()!.label);
    if (this.stage() === 'evidence') labels.push('Evidence');
    return labels;
  });

  readonly currentTone = computed(() => this.selectedDomain()?.tone ?? '#c9a84c');

  readonly detailTitle = computed(() => {
    switch (this.stage()) {
      case 'world':
        return 'Worldview Atlas';
      case 'domain':
        return this.selectedDomain()?.label ?? 'Domain Focus';
      case 'concept':
        return this.selectedConcept()?.label ?? 'Concept Focus';
      case 'claim':
        return this.selectedConcept()?.label ?? 'Claim Orbit';
      case 'evidence':
        return this.selectedClaim()?.label ?? 'Evidence Anchor';
      default:
        return 'Worldview Atlas';
    }
  });

  readonly detailSummary = computed(() => {
    switch (this.stage()) {
      case 'world':
        return 'A living atlas of civilization, concepts, arguments, and proofs. Start with the world, then descend deliberately into a domain.';
      case 'domain':
        return this.selectedDomain()?.summary ?? '';
      case 'concept':
        return this.selectedConcept()?.summary ?? '';
      case 'claim':
        return this.selectedConcept()
          ? 'Claims surface around the selected concept as interpretable propositions rather than free-floating labels.'
          : '';
      case 'evidence':
        return this.selectedClaim()?.summary ?? '';
      default:
        return '';
    }
  });

  readonly currentClaims = computed(() => this.selectedConcept()?.claims ?? []);
  readonly currentEvidence = computed(() => this.selectedClaim()?.evidence ?? []);

  ngAfterViewInit(): void {
    this.runEntranceAnimation();
  }

  enterHome(): void {
    void this.router.navigateByUrl('/home');
  }

  selectDomain(domain: DomainNode): void {
    this.selectedDomain.set(domain);
    this.selectedConcept.set(null);
    this.selectedClaim.set(null);
    this.stage.set('domain');
    this.animateFocus('.atlas__domain-layer');
  }

  selectConcept(concept: ConceptNode): void {
    this.selectedConcept.set(concept);
    this.selectedClaim.set(null);
    this.stage.set('concept');
    this.animateFocus('.atlas__concept-layer');
  }

  showClaims(): void {
    if (!this.selectedConcept()) return;
    this.stage.set('claim');
    this.animateFocus('.atlas__claim-layer');
  }

  selectClaim(claim: ClaimNode): void {
    this.selectedClaim.set(claim);
    this.stage.set('evidence');
    this.animateFocus('.atlas__evidence-layer');
  }

  goBackOneLevel(): void {
    switch (this.stage()) {
      case 'evidence':
        this.selectedClaim.set(null);
        this.stage.set('claim');
        this.animateFocus('.atlas__claim-layer');
        return;
      case 'claim':
        this.stage.set('concept');
        this.animateFocus('.atlas__concept-layer');
        return;
      case 'concept':
        this.selectedConcept.set(null);
        this.stage.set('domain');
        this.animateFocus('.atlas__domain-layer');
        return;
      case 'domain':
        this.resetWorld();
        return;
      default:
        return;
    }
  }

  resetWorld(): void {
    this.selectedDomain.set(null);
    this.selectedConcept.set(null);
    this.selectedClaim.set(null);
    this.stage.set('world');
    this.animateFocus('.atlas__world-layer');
  }

  private runEntranceAnimation(): void {
    const hero = this.heroRef.nativeElement;
    const detailPanel = this.detailPanelRef.nativeElement;
    const lines = hero.querySelectorAll('.atlas__world-line');
    const nodes = hero.querySelectorAll('.atlas-node--domain');

    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timeline
      .fromTo(
        hero.querySelector('.atlas__nebula'),
        { opacity: 0 },
        { opacity: 1, duration: 1.4 },
      )
      .fromTo(
        hero.querySelector('.atlas__sphere'),
        { opacity: 0, scale: 0.86, filter: 'blur(12px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.55, clearProps: 'filter' },
        '-=0.95',
      )
      .fromTo(
        hero.querySelectorAll('.atlas__sphere-ring, .atlas__sphere-grid'),
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 1.1, stagger: 0.08, clearProps: 'transform' },
        '-=1.05',
      )
      .fromTo(
        lines,
        { opacity: 0, strokeDashoffset: 200 },
        { opacity: 1, strokeDashoffset: 0, duration: 1.9, stagger: 0.03 },
        '-=1.0',
      )
      .fromTo(
        nodes,
        { opacity: 0, y: 18, scale: 0.92, filter: 'blur(8px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.78, stagger: 0.07, clearProps: 'filter' },
        '-=1.35',
      )
      .fromTo(
        detailPanel,
        { opacity: 0, x: 28, filter: 'blur(12px)' },
        { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.95, clearProps: 'filter' },
        '-=1.1',
      )
      .fromTo(
        hero.querySelector('.atlas__hero-caption'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.45',
      );
  }

  private animateFocus(selector: string): void {
    requestAnimationFrame(() => {
      const target = this.heroRef.nativeElement.querySelector(selector);
      if (!target) return;
      gsap.fromTo(
        target,
        { opacity: 0.35, y: 18, scale: 0.97, filter: 'blur(6px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.62, ease: 'power3.out', clearProps: 'filter,transform' },
      );
    });
  }

  private findDomain(id: string): DomainNode | undefined {
    return this.domains.find((domain) => domain.id === id);
  }

  private lineFor(id: string, x1: number, y1: number, x2: number, y2: number): GraphEdge {
    return { id, x1, y1, x2, y2 };
  }

  private positionNodes<T>(
    items: T[],
    centerX: number,
    centerY: number,
    radius: number,
    startAngleDeg: number,
  ): PositionedNode<T>[] {
    if (items.length === 0) return [];
    if (items.length === 1) {
      return [{ item: items[0], x: centerX, y: centerY - radius }];
    }

    const step = 360 / items.length;
    return items.map((item, index) => {
      const angle = ((startAngleDeg + step * index) * Math.PI) / 180;
      return {
        item,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 0.78,
      };
    });
  }

  private positionArc<T>(
    items: T[],
    centerX: number,
    centerY: number,
    radius: number,
    startAngleDeg: number,
    endAngleDeg: number,
  ): PositionedNode<T>[] {
    if (items.length === 0) return [];
    if (items.length === 1) {
      const angle = ((startAngleDeg + endAngleDeg) / 2 * Math.PI) / 180;
      return [{ item: items[0], x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius }];
    }

    const step = (endAngleDeg - startAngleDeg) / (items.length - 1);
    return items.map((item, index) => {
      const angle = ((startAngleDeg + step * index) * Math.PI) / 180;
      return {
        item,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 0.74,
      };
    });
  }
}
