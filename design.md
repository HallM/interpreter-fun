There will be a set of AST visitors that take the AST and turn it into a set of pre-conditions and post-conditions.
It is possible some will return a future-pointer to the set (ex function call).

Both pre- and post-conditions can be stated to be optional given a condition applies
For example, a Function can be "return Number if a is truthy" and "return String if a is falsy"

Examples of a pre-condition:
- Must be declared
- Must be defined (not undefined)
- Must be non-null
- Must be Type {} or {} or {} ...
- (Object) Must contain property
- (Array) Must have length at least {}
- (Number) Must not be NaN
- (Number) Must be in range

Examples of a post-condition:
- Narrowers
- Conditions known held to be true
- {} is modified
- {} is accessed
- {} is now known to be type {}
- (Number) is now constrained to range

Both pre- and post-conditions contain:
- Conditions which are necessary for the pre- or post-condition
- What the pre- or post-condition is and any necessary data to resolve it

There are two phases:

The original design called for phase 1 to build some pre and post conditions, then phase 2 to validate.
Turns out, that doesn't exactly work.
Most elements are complex containers of other elements. Successive elements in the container may rely on previous elements.
Example: `t = [t, t = 7, t]`

- Phase 1:
  - Load and scan files for functions to be validated
    - Finding all functions
    - Finding function calls
      - Building a graph between function calls
      - Finding "require'd" files to know to scan those too
    - Deal with hoisting rules

- Phase 2:
  - Consider the global scope to be a "function" in itself
  - Process each function who call no functions or call functions which are already resolved
    - Create a state coming into the function
    - For each statement:
      - For a function call, just use the determined pre- and post-conditions already determined
      - Determine if pre-conditions are valid or attempt to bubble them up to a parent statement
      - If it cannot, record the issue, assume it is fine, and continue processing
      - Apply post-conditions to the state or to the parent

  - If there is none, handle recursive*
    - Pick one to process, but only process return types.
    - Have to recursively move through the chain and stop any time a node is already found
    - Slowly pull together post-conditions, but be aware that conditional post-conditions could be infinite

An interesting feature down the road could be finding code which could never execute.
We would need to track all the possible conditions in which a function is entered,
  then track which conditions could not be executed as a result.
Some cases are defensive "should never happen, but be prepared!" cases.
Some are mistakes that were not intended.
