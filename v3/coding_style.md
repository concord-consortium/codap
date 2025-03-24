## **Overview**

This guide is written in the spirit of [Google Style Guides](https://github.com/google/styleguide), especially the most well written ones like for [Obj-C](https://github.com/google/styleguide/blob/gh-pages/objcguide.md).

Coding style guides are meant to help everyone who contributes to a project to forget about how code feels and easily understand the logic.

These are guidelines with rationales for all rules. If the rationale doesn't apply, or changes make the rationale moot, the guidelines can safely be ignored.

## **General Principles**

### **Consistency is king**

Above all other principles, be consistent.

If a single file all follows one convention, just keep following the convention. Separate style changes from logic changes.

**Rationale**: If same thing is named differently (`Apple`, `a`, `fruit`, `redThing`), it becomes hard to understand how they're related.

### **Readability above efficiency**

Prefer readable code over fewer lines of cryptic code.

**Rationale**: Code will be read many more times than it will be written, by different people. Different people includes you, only a year from now.

### **All code is either obviously right, or non-obviously wrong.**

Almost all code should strive to be obviously right at first glance. It shouldn't strike readers as "somewhat odd", and need detailed study to read and decipher.

**Rationale**: If code is obviously right, it's probably right. The goal is to have suspicious code look suspiciously wrong and stick out like a sore thumb. This happens when everything else is very clear, and there's a tricky bit that needs to be worked on.

*Corollary*: Code comments are a sign that the code isn't particularly well explained via the code itself. Either through naming, or ordering, or chunking of the logic. Both code and comments have maintenance cost, but comments don't explicitly do work, and often go out of sync with associated code. While not explicitly disallowed, strive to make code require almost no comments.

Good cases to use comments include describing **why** the code is written that way (if naming, ordering, scoping, etc doesn't work) or explaining details which couldn't be easily explained in code (e.g., which algorithm/pattern/approach is used and why).

*Exception*: API interfaces *should* be commented, as close to code as possible for keeping up to date easily.

**Further Reading**: https://www.joelonsoftware.com/2005/05/11/making-wrong-code-look-wrong/

### **Boring is best**

Make your code the most boring version it could be.

**Rationale**: While you may have won competitions in code golf, the goal of production code is NOT to have the smartest code that only geniuses can figure out, but that which can easily be maintained. On the other hand, devote your creativity to making interesting test cases with fun constant values.

### **Split implementation from interface**

Storage, presentation, communication protocols should always be separate.

**Rationale**: While the content may coincidentally look the same, all these layers have different uses. If you tie things in the wrong place, then you will break unintentionally in non-obvious bad ways.

### **Split "policy" and "mechanics"**

Always separate the configuration/policy ("the why") from the implementation/mechanics ("the how").

**Rationale**: You can test the implementation of what needs to be done. You can also test the policy triggers at the right time. Turning a feature on and off makes it much easier to throw in more features and later turn them on/off and canary.

**Corollary**: Create separate functions for "doing" and for "choosing when to do".

**Corollary**: Create flags for all implementation features.

# **Deficiency Documentation (`TODO`s and `FIXME`s)**

### **`TODO` comments**

Use `TODO` comments *liberally* to describe anything that is potentially missing.

Code reviewers can also liberally ask for adding `TODO`s to different places.

Format:

`// TODO[(Context)]: <Action> by/when <Deadline Condition>`

`TODO` comments should have these parts:

- **Context** - (*Optional*) JIRA issue, etc. that can describe what this thing means better.
    - Issues or other documentation should be used when the explanations are pretty long or involved.
    - Code reviewers should verify that important `TODO`s have filed JIRA Issues.
    - Examples:
        - `CARE-XXX` - Issue description
- **Action** - Very specific actionable thing to be done. Explanations can come after the particular action.
    - Examples:
        - `Refactor into single class...`
        - `Add ability to query Grafana...`
        - `Replace this hack with <description> ...`
- **Deadline Condition** - when to get the thing done by.
    - Deadline Conditions should **NOT** be relied on to *track* something done by a time or milestone.
    - Examples:
        - `... before General Availability release.`
        - `... when we add <specific> capability.`
        - `... when XXX bug/feature is fixed.`
        - `... once <person> approves of <specific thing>.`
        - `... when first customer asks for it.`
        - Empty case implies "`...when we get time`". Use *only* for relatively unimportant things.

**Rationale**: `TODO` comments help readers understand what is missing. Sometimes you know what you're doing is not the best it could be, but is good enough. That's fine. Just explain how it can be improved.

Feel free to add `TODO` comments as you edit code and read other code that you interact with. If you don't understand something, add `TODO` to document how it might be better, so others may be able to help out.

Good Examples:

`// TODO: Replace certificate with staging version once we get letsencrypt to work.

// TODO(CARE-XXX): Replace old logic with new logic when out of experimental mode.

// TODO(SCIENCE-XXX): Colonize new planets when we get cold fusion capability.`

Mediocre examples(lacks Deadline Condition) - Good for documenting, but not as important:

`// TODO: Add precompiling templates here if we need it.

// TODO: Remove use of bash.

// TODO: Clean up for GetPatient/GetCaseWorker, which might be called from http handlers separately.

// TODO: Figure out how to launch spaceships instead of rubber duckies.`

Bad examples:

`// TODO: wtf? (what are we f'ing about?)

// TODO: We shouldn't do this. (doesn't say what to do instead, or why it exists)

// TODO: err...`

### **`FIXME` comments**

Use `FIXME` comments as **stronger** `TODO`s that **MUST** be done before code submission. These comments are **merge-blocking**.

`FIXME` should be liberally used for notes during development, either for developer or reviewers, to remind and prompt discussion. Remove these comments by fixing them before submitting code.

During code review, reviewer *may* suggest converting `FIXME` -> `TODO`, if it's not important to get done before getting something submitted. Then [`TODO` comment](https://github.com/MindStrongHealth/experimental/blob/master/users/teejae/coding-style.md#todo-comments) formatting applies.

Format (same as [`TODO` comments](https://github.com/MindStrongHealth/experimental/blob/master/users/teejae/coding-style.md#todo-comments), but more relaxed):

`// FIXME: <Action or any note to self/reviewer>

// FIXME: Remove hack

// FIXME: Revert hardcoding of server URL

// FIXME: Implement function

// FIXME: Refactor these usages across codebase. <Reviewer can upgrade to TODO w/ JIRA ticket during review>

// FIXME: Why does this work this way? <Reviewer should help out here with getting something more understandable>`

**Rationale**: These are great self-reminders as you code that you haven't finished something, like stubbed out functions, unimplemented parts, etc. The reviewer can also see the `FIXME`s to eye potential problems, and help out things that are not understandable, suggesting better fixes.

# **Code**

## **Naming**

### **Variables should always be named semantically.**

Names of variables should reflect their content and intent. Try to pick very specific names. Avoid adding parts that don't add any context to the name. Use only well-known abbreviations, otherwise, don't shorten the name in order to save a couple of symbols.

```
// Bad
input = "123-4567"
dialPhoneNumber(input) // unclear whether this makes semantic sense.

// Good
phoneNumber = "123-4567"
dialPhoneNumber(phoneNumber) // more obvious that this is intentional.

// Bad
text = 1234
address = "http://some-address/patient/" + text  // why is text being added to a string?

// Good
patientId = 1234
address = "http://some-address/patient/" + patientId // ah, a patient id is added to an address.

```

**Rationale**: Good semantic names make bugs obvious and expresses intention, without needing lots of comments.

### **Always add units for measures.**

Time is especially ambiguous.

Time intervals (duration): `timeoutSec`, `timeoutMs`, `refreshIntervalHours`

Timestamp (specific instant in time): `startTimestamp`. (Use language-provided representations once inside code, rather than generic `number`, `int` for raw timestamps. JS/Java: `Date`, Python: `datetime.date/time`, Go: `time.Time`)

Distances: `LengthFt`, `LengthMeter`, `LengthCm`, `LengthMm`

Computer Space: `DiskMib` (1 Mebibyte is 1024 Kibibytes), `RamMb` (1 Megabyte is 1000 Kilobytes)

```
// Bad
Cost = Disk * Cents

// Good
CostCents = DiskMib * 1024 * CentsPerKilobyte

```

**Rationale**: Large classes of bugs are avoided when you name everything with units.

## **Constants**

### **All literals should be assigned to constants (or constant-like treatments).**

Every string or numeric literal needs to be assigned to a constant.

**Exceptions**: Identity-type zero/one values: `0`, `1`, `-1`, `""`

**Rationale**: It is never obvious why random number or string literals appear in different places. Even if they are somewhat obvious, it's hard to debug/find random constants and what they mean unless they are explicitly defined. Looking at collected constants allows the reader to see what is important, and see tricky edge cases while spelunking through the rest of the code.

# **Tests**

All commentary in the Code section applies here as well, with a few relaxations.

### **Repetitive test code allowed**

In general, do not repeat yourself. However, IF the test code is clearer, it's ok to repeat.

**Rationale**: Readability above all else. Sometimes tests are meant to test lots of niggling nefarious code, so we make exceptions for those cases.

### **Small Test Cases**

Make test cases as small and targeted as possible.

**Rationale**: Large tests are both unwieldy to write, and hard to debug. If something takes lots of setup, it's usually a sign of a design problem with the thing you're testing. Try breaking up the code/class/object into more manageable pieces.

### **No complex logic**

Avoid adding complex logic to test cases. It's more likely to have a bug in this case, while the purpose of the test cases is to prevent bugs. It's better to [repeat](https://github.com/MindStrongHealth/experimental/blob/master/users/teejae/coding-style.md#repetitive-test-code-allowed) or use a helper function covered with test cases.

### **Be creative in the content, but *not* the variable names.**

Just as for regular code, name variables for how they will be used. Intent is unclear when placeholders litter the code.

Use creative values for testing that don't look too "normal", so maintainers can tell values are obviously test values.

```
// Bad
login("abc", "badpassword")  // Are "abc" and "badpassword" important?
testMemberId = "NA12312412"  // Looks too "real", and unclear if it needs to follow this form

// Good
testMemberId = "some random member id"
testName = "abc"
testPassword = "open sesame"
testBadPassword = "really bad password! stop it!"

login(testName, testPassword) // Success
login(testName, testBadPassword) // Failure

```

**Rationale**: When the names of the variables are obvious, it becomes clear what is important in the tests.

### **No "spooky action at a distance"**

Collect all related logic/conditions into a single place, so it's easy to grasp how the different parts are related.

```
// Bad
startingInvestmentDollars = 100
invest()
... lots of test code ...
invest()
loseMoney()
expect(investment == 167)  // Why 167?

// Good
startingInvestmentDollars = 100
returnInterestRatePercent = 67
endingInvestmentDollars = 167 // More obvious where 167 comes from.
... lots of test code ...
expect(investment == endingInvestmentDollars)

```

**Rationale**: When all related things are collected in a single place, you can more clearly understand what you think you'll read. The rest is just checking for mechanics.
