# Writing like the student, not like a model

AI detectors mostly aren't magic - they key on a handful of measurable things: how much sentence
length varies (burstiness), how predictable each next word is given the ones before it
(perplexity - generated text tends to pick the statistically likely word every time, human text
doesn't), and a smallish set of words and phrasings that show up disproportionately in generated
academic text. You don't beat this by tricking a checker after the fact. You beat it by writing the
way an actual tired student writes a real answer once, which happens to score low on all three
measures naturally. Do it in this order, not as a find-and-replace pass at the end.

## The words and phrases to just not use

These aren't banned because they're bad English - they're banned because a generated-text detector
(and a human grader who's read a thousand ChatGPT essays this year) has seen them so often that
they're now a tell by themselves.

Transition and hedge words: *moreover, furthermore, additionally, in conclusion, in summary, it is
important to note, it is worth noting, it should be noted, notably, arguably, undoubtedly, overall,
ultimately, essentially, fundamentally.* Plain student writing connects ideas with "so," "but,"
"because," "which means," or just a period and a new sentence - not a formal transition word bolted
onto the front.

Inflated verbs and nouns: *delve, boast, tapestry, testament to, underscore, foster, leverage,
harness, unlock, navigate, landscape, realm, journey, robust, intricate, seamless, comprehensive,
multifaceted, myriad, plethora, paramount, pivotal, crucial* (used more than once a page), *in
today's world/era, in the realm of, at its core, when it comes to.* If you catch yourself writing "in
the ever-evolving landscape of digital logic," stop and just say what you mean.

Symmetric hedge openers: "While X, it's important to remember Y" used more than once in the same
piece. One hedge is fine. A hedge every paragraph reads as a template.

## The em dash problem

Generated text leans hard on the em dash as a universal connector - for asides, for lists, for
mid-sentence pivots, all with the same punctuation mark. Real writers mostly reach for one of several
different tools depending on what they actually mean: a comma for a soft aside, a period and a new
sentence for a real pivot, a colon when what follows explains what came before, parentheses for a
genuine aside that isn't part of the main clause. If you've used an em dash more than once in a
page, go back and figure out which of those four it was actually doing and use that instead.

## Sentence rhythm

Generated academic prose tends toward sentences that are all roughly the same length and all built
the same way - subject, verb, qualifier, supporting clause, repeat. Real writing doesn't do that. It
runs a long sentence with a couple of subordinate clauses in it, then a short one that just states
the point. Sometimes a sentence is four words. After you draft a paragraph, read the sentence lengths
in your head - if three sentences in a row could be swapped for each other and nothing would feel
off, break the rhythm.

**Generated shape:**
> Combinational circuits process inputs to generate outputs without memory elements. Sequential
> circuits, in contrast, incorporate memory elements that allow them to retain state. This
> distinction is fundamental to understanding their respective applications in digital systems.

**More like how a person actually writes it:**
> A combinational circuit has no memory. Whatever the inputs are right now is the whole story - the
> output only depends on that instant, not on anything that happened a second ago. A sequential
> circuit is different because it remembers the last state and uses that alongside the new inputs,
> which is exactly why a flip-flop needs a clock signal and a plain AND gate doesn't.

Notice the second version also commits to an explanation instead of just restating both definitions
side by side and calling the difference "fundamental" without saying what it actually changes.

## Triplets and forced parallelism

"Combinational circuits are fast, efficient, and reliable" is a pattern generated text produces
constantly because three parallel adjectives is a safe, generic-sounding move. A person who actually
has an opinion usually picks the one or two things that matter and explains why, instead of listing
three interchangeable virtues. If a sentence has three parallel items and you can't say why each one
specifically matters here, cut it to one and explain that one properly.

## Commit to a claim

Generated text hedges by default - "this can potentially lead to," "may result in," "could
arguably be seen as." A student who actually worked through the truth table and simplified the
Boolean expression knows the answer, not a probability distribution over answers. Say "this gives L =
S" not "this could be interpreted as suggesting L may equal S." Hedge only where the real uncertainty
is - e.g., you genuinely don't know how instructors will grade a zero-gate answer, so say that
plainly, once, rather than hedging every technical claim in the paragraph out of habit.

## Specificity beats general statements

"Elevators use combinational logic to make quick decisions based on multiple inputs" is true of
every elevator ever built and says nothing. "If someone's holding the door open and another person
presses the call button on floor 6, the circuit has to decide whether to move or wait, and it makes
that call the instant both signals are read - there's no memory of what the elevator was doing thirty
seconds ago" is specific enough that it could only have come from someone who actually thought about
the mechanism. Specificity is also just what makes an explanation actually demonstrate understanding
for the rubric, so this isn't purely a style fix - vague-but-fluent writing tends to bleed rubric
points on "comprehensive and accurate" too.

## A couple of structural habits that read as generated

- Every paragraph starting with a topic sentence that restates the section heading in slightly
  different words. Sometimes just start with the actual point.
- A concluding sentence at the end of every single paragraph that summarizes what the paragraph just
  said. Most paragraphs don't need one - the next paragraph can just start.
- Numbered or bulleted lists standing in for prose in a Discussion post or Learning Journal, when the
  assignment explicitly asks for paragraphs. Use bullets only for an actual table-like enumeration
  (a truth table, a list of components), not to avoid writing connected sentences.
- Contractions never appearing anywhere. Real academic writing in a first-person reflective journal
  or discussion post uses "I'm," "it's," "doesn't" sometimes - not every sentence, but their total
  absence across an entire piece is itself a tell.

## Read it back once before you're done

After a full draft, read it once as if you were the grader who has seen forty other submissions this
week. If a sentence could have been dropped unchanged into anyone else's answer on this exact prompt,
that's the sentence to make specific. If two sentences in a row have the same shape, break one.
