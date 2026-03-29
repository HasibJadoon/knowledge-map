#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const DB_NAME = 'knowledgemap';
const UNIT_ID = 'sru-hallaq-impossible-state-ch1';

const clean = (text) => text.replace(/\s+/g, ' ').trim();
const h = (text) => ({ type: 'heading', text: clean(text) });
const s = (text) => ({ type: 'subheading', text: clean(text) });
const p = (text) => ({ type: 'paragraph', text: clean(text) });
const q = (text, cite, label, href) => ({
  type: 'quote',
  text: clean(text),
  cite: clean(cite),
  ...(label && href ? { label: clean(label), href: href.trim() } : {}),
});
const l = (label, href) => ({ type: 'link', label: clean(label), text: clean(label), href: href.trim() });
const divider = () => ({ type: 'separator' });

const chapterSummary =
  'Hallaq frames the modern Islamic state as a contradiction in terms, retrieving premodern sharia as a moral paradigm against the modern doctrine of progress.';

const readingBlocks = [
  h('Premises'),
  s('Opening Quotations'),
  q(
    `The paradigmatic case becomes such by suspending, and at the same time exposing, its belonging to the group, so that it is never possible to separate its exemplarity from its singularity. The paradigmatic group is never presupposed by the paradigms; rather, it is immanent in them.`,
    `Giorgio Agamben, The Signature of All Things`,
    `Explaining Agamben's Paradigmatic Case`,
    `https://www.notion.so/Explaining-Agamben-s-Paradigmatic-Case-1925d2855d0e805aa4ece75547aca037?pvs=21`,
  ),
  q(
    `Humanism is not a science, but religion. Humanists like to think they have a rational view of the world, but their core belief in progress is a superstition, further from the truth about the human animal than any of the world's religions.`,
    `John Gray, Straw Dogs`,
    `Explaining John Gray's Critique of Humanism in Straw Dogs`,
    `https://www.notion.so/Explaining-John-Gray-s-Critique-of-Humanism-in-Straw-Dogs-1925d2855d0e80cebb4cd58c40c982a5?pvs=21`,
  ),
  q(
    `In a narcissistic society, the cultural devaluation of the past rejects not only the poverty of prevailing ideologies that have lost their grip on reality, but also the poverty of the narcissist's inner life. A culture that turns nostalgia into a commodity repudiates the suggestion that life in the past may in important ways have been better than life today. Its indifference to the past, shading into hostility and rejection, furnishes the most telling proof of cultural bankruptcy.`,
    `Christopher Lasch, The Culture of Narcissism`,
    `Understanding Narcissism in Detail`,
    `https://www.notion.so/Understanding-Narcissism-in-Detail-1925d2855d0e80abbc8bce23ac328858?pvs=21`,
  ),
  divider(),
  h('The Modern Islamic State and Its Challenges'),
  p(
    `The modern Islamic state appears in this chapter as an impossibility. Postcolonial Muslim regimes inherited colonial power structures, reproduced authoritarian rule, and transformed sharia into a politically manipulated symbol rather than a living mode of governance. For Hallaq, the relevant field of inquiry is therefore not the failed modern experiment but the paradigmatic form of premodern Islamic governance.`,
  ),
  divider(),
  h('The Question of a Modern Islamic State'),
  s('Postcolonial Nationalism and the Inherited State Structures'),
  p(
    `The proposition that a modern Islamic state is impossible contains two hidden questions. If such a state is inconceivable, how did Muslims govern themselves across the centuries when they commanded vast civilizations and empires? And if the modern Islamic state is impossible, what form of political rule are Muslims now adopting in its place? Hallaq brackets the predictive question about the future and turns instead to the present as the cumulative result of nearly two centuries of colonial rule, nationalist reaction, and institutional continuity.`,
  ),
  p(
    `Postcolonial nationalist elites, he argues, preserved the structures of power inherited from empire and frequently pursued the same colonial policies they had once resisted. Europe handed them a ready-made nation-state whose constitutive power structures did not grow organically from existing Muslim social formations. The citizen-subject on which the modern state depends emerged only unevenly, while the political void left by collapsing traditional forms was never adequately filled. The result is a state form that sits awkwardly in the Muslim world, most clearly in Iran, where the state apparatus subordinated and disfigured sharia's norms of governance and thereby damaged both the Islamic and modern projects alike. Across the wider Muslim world, authoritarianism and shallow invocations of sharia confirm the same pattern of failure.`,
  ),
  l(
    `How Iran's State Apparatus Has Led to the Failure of Both Islamic Governance and the Modern State`,
    `https://www.notion.so/How-Iran-s-State-Apparatus-Has-Led-to-the-Failure-of-Both-Islamic-Governance-and-the-Modern-State-1935d2855d0e80e08aa3c9dde8dee938?pvs=21`,
  ),
  divider(),
  h('The Failure of the Modern Islamic Experiment'),
  p(
    `Hallaq therefore dismisses the modern Muslim state's legal and political experiment as a massive failure from which Muslims can learn almost nothing positive about governing themselves properly. The sharia enshrined in constitutions as a or the source of law has become politically abused and institutionally dead. Modern Islamic states cannot serve as models for a meaningful restoration of sharia, and their practices must not be used to measure or judge the paradigmatic sharia that governed Muslim life for over a millennium before colonial disruption.`,
  ),
  divider(),
  h('Premodern Islamic Governance and Its Legacy'),
  p(
    `Premodern Islamic governance differs categorically from the modern state. It was not a proto-version of European statehood but a distinct moral and legal order whose governing paradigm was sharia. Modern Muslims therefore inhabit a dissonant world in which inherited moral aspirations are forced to coexist with institutions, narratives, and crises generated elsewhere.`,
  ),
  s('The Premodern Islamic Governance Model'),
  p(
    `If the modern Islamic state is impossible, then no such state could have existed in precolonial Muslim history either. The modern state's genealogy is exclusively European, and for that reason alone it could not, ipso facto, have been Islamic. More importantly, there was a qualitative difference between even premodern prototypical states and Islamic forms of governance. To group Islamic governance indistinctly with other premodern states is, for Hallaq, to miss the paradigmatic forces that gave Islamic life its specific form and content.`,
  ),
  s('The Struggles of Muslims in the Modern World'),
  p(
    `The political, legal, and cultural struggles of modern Muslims emerge from a dissonance between their moral aspirations and a modern world not of their own making. Euro-America inhabits institutions that arose internally from the Enlightenment, industrialization, modern science, nationalism, capitalism, and constitutional traditions. Much of the rest of the world was compelled to follow this path, often at the cost of abandoning its own historical resources, ecological stability, and organic social forms. Modernity has not given most of humanity a fair inheritance; it has demanded imitation while eroding local histories and ways of life.`,
  ),
  divider(),
  h('The Impact of Modernity on Morality and Society'),
  p(
    `Modernity has transformed many natural hardships into man-made crises. Poverty, environmental destruction, and social fragmentation are now tied to capitalism, industrialism, and the displacement of moral considerations by technical and economic priorities. Hallaq's argument therefore turns toward alternative moral resources that can interrogate the modern project rather than simply submit to it.`,
  ),
  s('The Moral and Social Consequences of Modernity'),
  p(
    `Even if poverty, disease, and famine once belonged largely to the domain of nature, modernity reproduces them through human systems. Capitalism and industrialism destroy habitats and intensify deprivation. Equally consequential is the fragmentation of organic familial and communal structures under state capitalism. The collapse of traditional forms of association produces the disenchanted, fragmented, and narcissistic self diagnosed by many modern thinkers. Most devastating of all is the modern project's unprecedented destruction of the natural world, a project that reveals humanity's aspiration to become the ultimate measure of all things.`,
  ),
  s('The Role of Moral Accountability in Modernity'),
  p(
    `These counterclaims must finally be judged in moral terms. Ethical responsibility cannot be abdicated. Hallaq proposes a demanding account of morality: not merely treating strangers as one treats oneself, but being unable to commit an act because one cannot live with its consequences. Once morality is relegated to a secondary status and severed from science, economics, law, and politics, poverty, social disintegration, and ecological devastation become easier to normalize. In this moral collapse, the state is not incidental; it is one of the principal agents.`,
  ),
  s('The Search for Moral Resources Beyond Modernity'),
  p(
    `If modernity generates these failures, then other traditions must be consulted for moral resources. Hallaq aligns this search with thinkers such as Alasdair MacIntyre, Charles Taylor, and Charles Larmore, while insisting that Muslim traditions possess their own extensive and internally rooted resources. The point is not antiquarian nostalgia but the retrieval of a moral vocabulary capable of addressing modern social, economic, political, and legal crises.`,
  ),
  divider(),
  h('Tradition, Moral Reasoning, and Islamic Thought'),
  p(
    `Islamic tradition still shapes modern Muslim consciousness. This supports MacIntyre's claim that rational inquiry and ethical standards emerge within traditions and histories rather than from autonomous reason alone. Islamic moral resources are not merely abstract theories; they are embedded in institutions, practices, and lived forms of life.`,
  ),
  s('The Enduring Influence of Tradition on Moral Reasoning'),
  p(
    `The continuing force of Islamic tradition lends weight to MacIntyre's critique of Enlightenment rationality. Standards of rational justification emerge within a history that vindicates them. Moral reasoning is therefore inseparable from tradition, and Muslim ethical reflection remains intelligible only in relation to the longue duree of Islamic moral life.`,
  ),
  s('Islamic Tradition as a Composite Moral Framework'),
  p(
    `Hallaq argues that the Islamic tradition available for retrieval is richer than a merely philosophical canon. It combines theoretical reflection with sociological, anthropological, legal, political, and economic practices that became paradigmatic within Islamic history. Unlike conceptions of community that survive only as philosophical memory, Islamic governance once operated as a lived and institutionally embodied moral order.`,
  ),
  divider(),
  h('Paradigms and Their Role in Governance'),
  p(
    `Islamic governance and the modern state represent two different paradigms. The modern paradigm elevates technical progress, rational universalism, and bureaucratic power, whereas Islamic governance centers sharia as a moral and legal framework. To compare them meaningfully, one must identify the central domains and driving forces that organize each form of life.`,
  ),
  s('Paradigmatic Islamic Governance vs. The Modern State'),
  p(
    `To speak of Islamic governance is to distinguish living with the modern state from living with premodern sharia. The two may have possessed a similar range of social reach, but they differed dramatically in almost every other respect. A rational comparison requires attention to paradigms: the structures, relations, and conceptual orders that determine what counts as central and what becomes subordinate.`,
  ),
  s('Understanding Paradigms in Governance and Society'),
  p(
    `Hallaq begins from Carl Schmitt's notion of the central domain. When one domain becomes central, other problems are solved in its terms and become secondary by comparison. Schmitt's example is nineteenth-century technical progress, which attained quasi-religious status by promising that technological advancement would resolve moral, political, social, and economic problems alike. In a technical age, progress becomes the defining criterion of value and truth.`,
  ),
  s('The Enlightenment as a Paradigm of Universal Morality'),
  p(
    `The Enlightenment provides another paradigmatic example. Despite internal disagreements among Hobbes, Rousseau, Kant, Hegel, Marx, and others, Hallaq sees a shared substrate: the displacement of local and transcendental moralities by a critical, rational morality projected as the basis of universal civilization. As John Gray argues, this core project unites liberalism, Marxism, and later political variants under a single civilizational aspiration.`,
  ),
  s('The Interplay Between Central and Peripheral Paradigms'),
  p(
    `Hallaq expands Schmitt's model by insisting that paradigms are not simply linear hierarchies. Central and subsidiary domains are dialectically related. Subsidiary domains support and are shaped by the central one, and the values privileged in the central domain must pervade the entire system if that domain is to remain hegemonic. Paradigms are therefore systems of knowledge and practice held together by shared value structures, not merely by top-down priority.`,
  ),
  s('The Central Domain as a Driving Force'),
  p(
    `Following Foucault, Hallaq treats paradigms as fields of force relations in which competing discourses and strategies coexist. The central domain remains central so long as its values dictate the rules of play, even if they are constantly challenged from within. Discursive struggle does not negate the paradigm; it reveals how paradigmatic order is maintained against resistance and subversion.`,
  ),
  l(
    `The Central Domain as a Driving Force: Explanation with Real Examples`,
    `https://www.notion.so/The-Central-Domain-as-a-Driving-Force-Explanation-with-Real-Examples-19e5d2855d0e80f59515eb6e601d9325?pvs=21`,
  ),
  s('Diversity and Subversion in Paradigms'),
  p(
    `A paradigm can include diversity, irregularity, and violation. Such forces are subversive precisely because they do not positively determine the central domain, even if they negatively shape it through the responses they provoke. When subversive forces successfully replace the reigning value structure, the former paradigm is displaced and a new one takes its place.`,
  ),
  s('Paradigm Shifts in Modern Society'),
  p(
    `This pattern of paradigm shift appears across modern phenomena: the fact-value distinction, the separation of is from ought, the bureaucratic state, capitalism, and nationalism. Hallaq therefore speaks of both a paradigm of the modern state and a paradigm of Islamic governance, each constituted by a central domain and its supporting structures.`,
  ),
  divider(),
  h('The Role of Sharia in Governance and Society'),
  p(
    `In Islamic governance, sharia was the emblematic central domain. It operated as a moral system in which law served moral ends rather than becoming an end in itself. It shaped intellectual life, economic ethics, and political order, even while operating within the messiness and imperfection of real societies.`,
  ),
  s('The Sharia as a Moral Paradigm'),
  p(
    `For Hallaq, the significance of sharia lies in its status as a moral law. Its legal techniques were subordinate to a broader moral apparatus. The legal was an instrument of the moral, not the reverse. That is what made sharia paradigmatic and what renders it a potentially powerful moral resource for modern critique.`,
  ),
  s('The Role of Sharia in Intellectual and Educational Domains'),
  p(
    `As a central domain, sharia determined educational priorities and shaped a wide range of intellectual disciplines, including language, linguistics, hermeneutics, logic, rhetoric, dialectic, and epistemology. Even mathematics and astronomy developed in part through sharia-driven demands. Whatever field a scholar ultimately mastered, the foundational education remained sharia-centered.`,
  ),
  s('Sharia as the Foundation of Economic and Political Life'),
  p(
    `Economic life was regulated not only by technical rules but by a pervasive sharia ethic. Society itself was sharia-minded, and political governance, though less organically social than the economic sphere, was constrained by a culture that recognized sharia as the dominant ethical standard.`,
  ),
  s('The Imperfections and Realities of Sharia Governance'),
  p(
    `This did not make Islamic society utopian. Muslim societies had overtaxed peasants, abused spouses, insolvent debtors, thieves, rebels, and corrupt judges. Yet Hallaq insists that the moral law still ruled the day in paradigmatic terms. Social disorder existed, but it existed within a hegemonic moral system that persistently sought to address it and recreate a recognizable moral order.`,
  ),
  s('Jihad and the Pursuit of the Moral Ideal'),
  p(
    `The paradigmatic system rested on jihad understood in its literal sense of striving. Jihad signified the ongoing effort to realize the moral end, even amid failure, irregularity, and resistance. This moral psychology of striving is central to Hallaq's argument and must be separated from contemporary reductions of jihad to the logic of politics or violence.`,
  ),
  divider(),
  h('The Modern Muslim Identity and Moral Retrieval'),
  p(
    `Modern Muslim subjectivity is caught between secular state forms and a memory of sharia as a moral order. Islamism, for all its political distortions, signals a moral protest against corruption, domination, and injustice. Hallaq therefore frames retrieval not as restoration of institutions but as recovery of a moral vocabulary with which Muslims can confront modernity.`,
  ),
  s('The Modern Muslim Subject and the Moral Domain'),
  p(
    `Modern Muslims certainly possess the agency to adopt secular subjectivities, but the secularization project proved unstable across much of the twentieth century. The failures of Nasserism, socialism, and related programs were followed by the rise of Islamism, whose critiques of injustice and domination are fundamentally moral even when not philosophically elaborated. In Schmittian terms, the moral remains the latent central domain for many Muslim actors.`,
  ),
  s('The Legitimacy of Moral Retrieval from the Past'),
  p(
    `For that reason, the moral resources of paradigmatic Islamic governance remain relevant. Just as the modern West draws on the Renaissance, Enlightenment, and liberal tradition, Muslims can draw on their own history as a source of critique and deliberation. This does not mean restoring premodern institutions wholesale; it means retrieving paradigmatic values capable of confronting the failures of the modern project.`,
  ),
  s('The Sharia as a Moral Resource in the Modern World'),
  p(
    `Although sharia is institutionally defunct in its classical form, much of its moral and spiritual force survives in Muslim memory and practice, especially through the technologies of the self embedded in the pillars of Islam. Retrieval is therefore a moral project rather than an antiquarian one. It seeks a viable moral space for Muslim subjects who are no less disenchanted by modernity than their Western counterparts.`,
  ),
  s('Addressing the Charge of Nostalgia'),
  p(
    `Critics often dismiss such retrieval as nostalgia. Hallaq rejects this charge on two grounds. First, retrieval does not seek to roll back modernity but to recover moral instruction from a historical tradition. Second, the charge of nostalgia depends on an unexamined doctrine of progress that precludes rival historical interpretations before argument even begins.`,
  ),
  s('The Ideology of Modern Progress and Its Contradictions'),
  p(
    `Whenever nostalgia is invoked pejoratively, the doctrine of modern progress is close at hand. Progress uses history to justify itself while denying the authority of any historical interpretation that challenges its premises. By this illiberal maneuver, modernity presents itself as self-validating and dismisses ethical critique drawn from older traditions, even when those traditions offer resources for confronting ecological ruin and social fragmentation.`,
  ),
  divider(),
  h('The Doctrine of Progress and Its Ideological Foundations'),
  p(
    `Modernity sustains itself through reinvention while treating its own trajectory as unquestionable. The doctrine of progress is self-referential: it dismisses inherited wisdom while failing to answer the larger moral questions generated by the very order it defends.`,
  ),
  s('The Self-Sustaining Illusion of Modern Progress'),
  p(
    `Modernity claims it can solve its own crises on its own terms, yet ecological destruction continues unabated. Scientific and technical truths become authoritative only until they are displaced by newer truths. The doctrine of progress never asks why the system produces these pathologies in the first place. It lives in an unstable present, confident in its instruments but unable to submit itself to deeper moral interrogation.`,
  ),
  s('The Doctrine of Progress as a Self-Referential Authority'),
  p(
    `Progress has neither foundation nor reference outside itself. It becomes its own source of authority, a god of autonomous reason that excludes the big moral questions of the past as obsolete. Yet the reason those questions remain unheard is not their irrelevance; it is that the doctrine of progress lacks the conceptual equipment to face them while preserving its own supremacy.`,
  ),
  divider(),
  h('The Enlightenment and the Eurocentric Theory of Progress'),
  p(
    `The Enlightenment recast history as a universal narrative of progress culminating in Western modernity. This teleological and Eurocentric construction justified domination while presenting European development as the meaning toward which all past civilizations had unconsciously moved.`,
  ),
  s('The Doctrine of Progress and the Enlightenment Conception of History'),
  p(
    `In many cultures, history is structured eschatologically and morally. The Enlightenment instead rendered history homogeneous and teleological, treating the experiences of countless societies as stages in a single process of progressive improvement. Material advance, science, political development, and technical sophistication became the benchmarks by which historical maturity was measured.`,
  ),
  s('The Teleological Assumptions of the Theory of Progress'),
  p(
    `The theory of progress assumes that time itself has an inevitable direction and that earlier civilizations existed as preparatory stages for the emergence of Western modernity. This view legitimates the present by casting it as historically destined. It simultaneously portrays non-Western or premodern cultures as immature, incomplete, or merely instrumental to a civilizational goal outside themselves.`,
  ),
  s('Eurocentrism and the Idea of Progress in Historical Narratives'),
  p(
    `From Condorcet to Hegel, the idea of progress structured world history in specifically European terms. Setbacks became instructive mistakes on the path to modern Europe. Entire civilizations were narrated as if they lived and died to prepare for Europe's maturity, thereby reinforcing a thought-structure of domination that modernity still carries forward.`,
  ),
  s('The Doctrine of Progress as a Dominant Ideology'),
  p(
    `The Enlightenment theory of progress shaped not only historiography but the structures of modern language itself. It became one of the most powerful doctrines in Western civilization, a receptacle for ideology that authorizes its believers to regard themselves as absolutely right and their critics as absolutely wrong. In that sense, progress functions as one of the ruling languages of the modern gods.`,
  ),
  divider(),
  h('The Case for Moral Retrieval and Ethical Alternatives'),
  s('The Legitimacy of Moral Retrieval from the Past'),
  p(
    `Hallaq therefore proceeds on the assumption that any morally serious tradition, whether past or present, can be invoked as a resource of retrieval. The institutional past may be gone, but its moral principles are not. Invoking the paradigm of Islamic governance is thus as legitimate as invoking Aristotle, Aquinas, or Kant, and it is this moral retrieval that the rest of the book undertakes.`,
  ),
];

function readingBodyFromBlocks(blocks) {
  return blocks
    .flatMap((block) => {
      switch (block.type) {
        case 'heading':
        case 'subheading':
          return [block.text];
        case 'quote':
          return [block.text, block.cite];
        case 'link':
          return [`${block.label} - ${block.href}`];
        case 'paragraph':
          return [block.text];
        default:
          return [];
      }
    })
    .filter(Boolean);
}

function estimateReadingMinutes(blocks) {
  const text = blocks
    .map((block) => [block.text, block.cite, block.label].filter(Boolean).join(' '))
    .join(' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function parseWranglerJson(stdout) {
  const index = stdout.indexOf('[');
  if (index === -1) {
    throw new Error(`Could not parse Wrangler JSON output:\n${stdout}`);
  }
  return JSON.parse(stdout.slice(index));
}

function runWrangler(args) {
  const result = spawnSync('wrangler', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Wrangler exited with code ${result.status}`);
  }

  return result.stdout;
}

const selectSql = `
  SELECT unit_json
  FROM wv_source_units
  WHERE id = ${sqlString(UNIT_ID)}
`;

const selectRaw = runWrangler(['d1', 'execute', DB_NAME, '--remote', '--command', selectSql]);
const selectPayload = parseWranglerJson(selectRaw);
const currentRow = selectPayload?.[0]?.results?.[0];

if (!currentRow) {
  throw new Error(`Unit ${UNIT_ID} was not found in ${DB_NAME}`);
}

const currentJson = currentRow.unit_json ? JSON.parse(currentRow.unit_json) : {};
const readingBody = readingBodyFromBlocks(readingBlocks);
const readingMinutes = estimateReadingMinutes(readingBlocks);

const nextJson = {
  ...currentJson,
  readingSchema: 'km-reading-blocks-v1',
  reading_schema: 'km-reading-blocks-v1',
  readingMinutes,
  reading_minutes: readingMinutes,
  readingBody,
  reading_body: readingBody,
  readingBlocks,
  reading_blocks: readingBlocks,
};

const updateSql = `
  UPDATE wv_source_units
  SET anchor_text = ${sqlString('Premises')},
      summary = ${sqlString(chapterSummary)},
      unit_json = ${sqlString(JSON.stringify(nextJson))}
  WHERE id = ${sqlString(UNIT_ID)}
`;

const updateRaw = runWrangler(['d1', 'execute', DB_NAME, '--remote', '--command', updateSql]);
const updatePayload = parseWranglerJson(updateRaw);
const meta = updatePayload?.[0]?.meta ?? null;

console.log(
  JSON.stringify(
    {
      ok: true,
      unitId: UNIT_ID,
      readingBlocks: readingBlocks.length,
      readingMinutes,
      rowsWritten: meta?.rows_written ?? null,
      changedDb: meta?.changed_db ?? null,
    },
    null,
    2,
  ),
);
