import type { Frame, Obj, Scenario, Scope } from './types'

const obj = (id: string, label: string, type: string, state?: Obj['state']): Obj => ({ id, label, type, state })
const scope = (name: string, vars: Scope['vars'], active = false): Scope => ({ name, vars, active })
const frame = (line: number, note: string, scopes: Scope[], objects: Obj[], out: string[] = []): Frame => ({ line, note, scopes, objects, out })

const L1 = (s?: Obj['state']) => obj('L1', '[0, 1, 2, 3, 4]', 'list', s)
const L2 = obj('L2', '[10, 9, 8, 7, 6]', 'list')

const rebind: Scenario = {
  id: 'rebind',
  family: 'pass-by-reference',
  title: 'Reassigning a parameter',
  code: ['def change_list(inner_list):', '    inner_list = [10, 9, 8, 7, 6]', '', 'outer_list = [0, 1, 2, 3, 4]', 'change_list(outer_list)', 'print(outer_list)'].join('\n'),
  expectedOutput: '[0, 1, 2, 3, 4]',
  frames: [
    frame(4, 'The list is created and the global name outer_list points at it.', [scope('global', [{ name: 'outer_list', to: 'L1' }], true)], [L1()]),
    frame(5, 'Calling the function creates a new local scope. The parameter inner_list is a second name for the SAME list. Nothing is copied.', [scope('global', [{ name: 'outer_list', to: 'L1' }]), scope('change_list', [{ name: 'inner_list', to: 'L1' }], true)], [L1()]),
    frame(2, 'The assignment builds a NEW list and re-points the local name inner_list at it. outer_list still points at the original.', [scope('global', [{ name: 'outer_list', to: 'L1' }]), scope('change_list', [{ name: 'inner_list', to: 'L2' }], true)], [L1(), L2]),
    frame(5, 'The function returns. Its local scope disappears, and the new list has no names left.', [scope('global', [{ name: 'outer_list', to: 'L1' }], true)], [L1(), obj('L2', '[10, 9, 8, 7, 6]', 'list', 'dim')]),
    frame(6, 'outer_list was never touched. Reassigning a parameter only moves the local name.', [scope('global', [{ name: 'outer_list', to: 'L1' }], true)], [L1()], ['[0, 1, 2, 3, 4]']),
  ],
}

const mutate: Scenario = {
  id: 'mutate',
  family: 'pass-by-reference',
  title: 'Mutating the object',
  code: ['def change_list(inner_list):', '    inner_list.append(5)', '', 'outer_list = [0, 1, 2, 3, 4]', 'change_list(outer_list)', 'print(outer_list)'].join('\n'),
  expectedOutput: '[0, 1, 2, 3, 4, 5]',
  frames: [
    frame(4, 'The list is created and the global name outer_list points at it.', [scope('global', [{ name: 'outer_list', to: 'L1' }], true)], [L1()]),
    frame(5, 'The parameter inner_list is a second name for the same list.', [scope('global', [{ name: 'outer_list', to: 'L1' }]), scope('change_list', [{ name: 'inner_list', to: 'L1' }], true)], [L1()]),
    frame(2, 'append changes the list object itself. Both names point at that one object, so both see the change.', [scope('global', [{ name: 'outer_list', to: 'L1' }]), scope('change_list', [{ name: 'inner_list', to: 'L1' }], true)], [obj('L1', '[0, 1, 2, 3, 4, 5]', 'list', 'changed')]),
    frame(5, 'The function returns and its local name goes away. The mutation stays.', [scope('global', [{ name: 'outer_list', to: 'L1' }], true)], [obj('L1', '[0, 1, 2, 3, 4, 5]', 'list')]),
    frame(6, 'The caller sees the new element. The function never returned anything.', [scope('global', [{ name: 'outer_list', to: 'L1' }], true)], [obj('L1', '[0, 1, 2, 3, 4, 5]', 'list')], ['[0, 1, 2, 3, 4, 5]']),
  ],
}

const immutable: Scenario = {
  id: 'immutable',
  family: 'pass-by-reference',
  title: 'Immutable values',
  code: ['def bump(n):', '    n = n + 1', '    return n', '', 'x = 10', 'bump(x)', 'print(x)'].join('\n'),
  expectedOutput: '10',
  frames: [
    frame(5, 'The int 10 is created and the global name x points at it.', [scope('global', [{ name: 'x', to: 'I10' }], true)], [obj('I10', '10', 'int')]),
    frame(6, 'n is a second name for the same int object.', [scope('global', [{ name: 'x', to: 'I10' }]), scope('bump', [{ name: 'n', to: 'I10' }], true)], [obj('I10', '10', 'int')]),
    frame(2, 'Ints are immutable, so n + 1 makes a brand-new int 11 and n is re-pointed. There is no way to change the 10 in place.', [scope('global', [{ name: 'x', to: 'I10' }]), scope('bump', [{ name: 'n', to: 'I11' }], true)], [obj('I10', '10', 'int'), obj('I11', '11', 'int')]),
    frame(6, 'bump returns, but the caller threw the result away.', [scope('global', [{ name: 'x', to: 'I10' }], true)], [obj('I10', '10', 'int'), obj('I11', '11', 'int', 'dim')]),
    frame(7, 'x is still 10. Immutable objects behave like pass-by-value because nobody can change them in place.', [scope('global', [{ name: 'x', to: 'I10' }], true)], [obj('I10', '10', 'int')], ['10']),
  ],
}

const localX: Scenario = {
  id: 'local-x',
  family: 'scope-legb',
  title: 'Assigning inside a function',
  code: ['def f():', '    x = 2', '    print("x in function:", x)', '', 'x = 1', 'f()', 'print("x in main:", x)'].join('\n'),
  expectedOutput: 'x in function: 2\nx in main: 1',
  frames: [
    frame(5, 'A global x is created. (The global name f also exists; it is left out to keep the picture small.)', [scope('global', [{ name: 'x', to: 'I1' }], true)], [obj('I1', '1', 'int')]),
    frame(6, 'Calling f creates a new, empty local scope.', [scope('global', [{ name: 'x', to: 'I1' }]), scope('f', [], true)], [obj('I1', '1', 'int')]),
    frame(2, 'Assigning to x inside a function creates a LOCAL name x. It shadows the global x and does not overwrite it.', [scope('global', [{ name: 'x', to: 'I1' }]), scope('f', [{ name: 'x', to: 'I2' }], true)], [obj('I1', '1', 'int'), obj('I2', '2', 'int')]),
    frame(3, 'Python looks up x starting in the local scope, so it finds 2.', [scope('global', [{ name: 'x', to: 'I1' }]), scope('f', [{ name: 'x', to: 'I2' }], true)], [obj('I1', '1', 'int'), obj('I2', '2', 'int')], ['x in function: 2']),
    frame(6, 'f returns and its local scope disappears.', [scope('global', [{ name: 'x', to: 'I1' }], true)], [obj('I1', '1', 'int'), obj('I2', '2', 'int', 'dim')], ['x in function: 2']),
    frame(7, 'The global x was never changed.', [scope('global', [{ name: 'x', to: 'I1' }], true)], [obj('I1', '1', 'int')], ['x in function: 2', 'x in main: 1']),
  ],
}

const globalX: Scenario = {
  id: 'global-x',
  family: 'scope-legb',
  title: 'The global keyword',
  code: ['def f():', '    global x', '    x = 2', '    print("x in function:", x)', '', 'x = 1', 'f()', 'print("x in main:", x)'].join('\n'),
  expectedOutput: 'x in function: 2\nx in main: 2',
  frames: [
    frame(6, 'A global x is created.', [scope('global', [{ name: 'x', to: 'I1' }], true)], [obj('I1', '1', 'int')]),
    frame(7, 'Calling f creates a new, empty local scope.', [scope('global', [{ name: 'x', to: 'I1' }]), scope('f', [], true)], [obj('I1', '1', 'int')]),
    frame(2, '`global x` tells Python that the name x in this function means the GLOBAL x. No local x will be created.', [scope('global', [{ name: 'x', to: 'I1' }]), scope('f', [{ name: 'x', kind: 'declared', note: 'global' }], true)], [obj('I1', '1', 'int')]),
    frame(3, 'Because x is declared global, this assignment re-points the global name.', [scope('global', [{ name: 'x', to: 'I2' }]), scope('f', [{ name: 'x', kind: 'declared', note: 'global' }], true)], [obj('I1', '1', 'int', 'dim'), obj('I2', '2', 'int')]),
    frame(4, 'x is looked up and found in the global scope.', [scope('global', [{ name: 'x', to: 'I2' }]), scope('f', [{ name: 'x', kind: 'declared', note: 'global' }], true)], [obj('I2', '2', 'int')], ['x in function: 2']),
    frame(8, 'f has returned. The global x now really is 2.', [scope('global', [{ name: 'x', to: 'I2' }], true)], [obj('I2', '2', 'int')], ['x in function: 2', 'x in main: 2']),
  ],
}

const nonlocal: Scenario = {
  id: 'nonlocal',
  family: 'scope-legb',
  title: 'The nonlocal keyword',
  code: ['def outer():', '    a = 12', '    def inner():', '        nonlocal a', '        a = 99', '    inner()', '    print(a)', '', 'outer()'].join('\n'),
  expectedOutput: '99',
  frames: [
    frame(9, 'Calling outer creates its local scope.', [scope('global', [{ name: 'outer', to: 'F1' }]), scope('outer', [], true)], [obj('F1', 'outer', 'function')]),
    frame(2, 'a is a local name of outer. For inner, this scope is the ENCLOSING scope.', [scope('global', [{ name: 'outer', to: 'F1' }]), scope('outer', [{ name: 'a', to: 'I12' }], true)], [obj('F1', 'outer', 'function'), obj('I12', '12', 'int')]),
    frame(3, 'def creates the function object inner and binds the name in outer.', [scope('global', [{ name: 'outer', to: 'F1' }]), scope('outer', [{ name: 'a', to: 'I12' }, { name: 'inner', to: 'F2' }], true)], [obj('F1', 'outer', 'function'), obj('I12', '12', 'int'), obj('F2', 'inner', 'function')]),
    frame(6, 'Calling inner creates yet another local scope.', [scope('global', [{ name: 'outer', to: 'F1' }]), scope('outer', [{ name: 'a', to: 'I12' }, { name: 'inner', to: 'F2' }]), scope('inner', [], true)], [obj('F1', 'outer', 'function'), obj('I12', '12', 'int'), obj('F2', 'inner', 'function')]),
    frame(4, '`nonlocal a` says: the name a in inner is the one from the enclosing function.', [scope('global', [{ name: 'outer', to: 'F1' }]), scope('outer', [{ name: 'a', to: 'I12' }, { name: 'inner', to: 'F2' }]), scope('inner', [{ name: 'a', kind: 'declared', note: 'nonlocal' }], true)], [obj('F1', 'outer', 'function'), obj('I12', '12', 'int'), obj('F2', 'inner', 'function')]),
    frame(5, 'This assignment re-points outer\'s a, not a new local.', [scope('global', [{ name: 'outer', to: 'F1' }]), scope('outer', [{ name: 'a', to: 'I99' }, { name: 'inner', to: 'F2' }]), scope('inner', [{ name: 'a', kind: 'declared', note: 'nonlocal' }], true)], [obj('F1', 'outer', 'function'), obj('I12', '12', 'int', 'dim'), obj('F2', 'inner', 'function'), obj('I99', '99', 'int')]),
    frame(7, 'inner has returned. outer sees its own a, now 99.', [scope('global', [{ name: 'outer', to: 'F1' }]), scope('outer', [{ name: 'a', to: 'I99' }, { name: 'inner', to: 'F2' }], true)], [obj('F1', 'outer', 'function'), obj('F2', 'inner', 'function'), obj('I99', '99', 'int')], ['99']),
  ],
}


const I42 = obj('I42', '42', 'int')
const I43 = obj('I43', '43', 'int')

const rebindX: Scenario = {
  id: 'rebind-x',
  family: 'name-binding',
  title: 'Names point at objects',
  code: ['x = 42', 'x = x + 1', 'y = x', 'print(x, y)'].join('\n'),
  expectedOutput: '43 43',
  frames: [
    frame(1, 'The int 42 is created and the name x is linked to it. x is not a box that holds 42; it is a label on the object.', [scope('global', [{ name: 'x', to: 'I42' }], true)], [I42]),
    frame(2, 'x + 1 makes a NEW int, 43, because ints are immutable. Then the name x is re-pointed. The old 42 has no names left.', [scope('global', [{ name: 'x', to: 'I43' }], true)], [obj('I42', '42', 'int', 'dim'), I43]),
    frame(3, 'y = x copies nothing. y becomes a second name for the same object.', [scope('global', [{ name: 'x', to: 'I43' }, { name: 'y', to: 'I43' }], true)], [I43]),
    frame(4, 'Both names lead to the same 43.', [scope('global', [{ name: 'x', to: 'I43' }, { name: 'y', to: 'I43' }], true)], [I43], ['43 43']),
  ],
}

const swap: Scenario = {
  id: 'swap',
  family: 'name-binding',
  title: 'Simultaneous assignment',
  code: ['a = "left"', 'b = "right"', 'a, b = b, a', 'print(a, b)'].join('\n'),
  expectedOutput: 'right left',
  frames: [
    frame(1, 'a points at the string "left".', [scope('global', [{ name: 'a', to: 'S1' }], true)], [obj('S1', '"left"', 'str')]),
    frame(2, 'b points at the string "right".', [scope('global', [{ name: 'a', to: 'S1' }, { name: 'b', to: 'S2' }], true)], [obj('S1', '"left"', 'str'), obj('S2', '"right"', 'str')]),
    frame(3, 'The right-hand side is evaluated first, giving the pair (b, a). Then BOTH names are re-pointed at once. No temporary variable is needed.', [scope('global', [{ name: 'a', to: 'S2' }, { name: 'b', to: 'S1' }], true)], [obj('S1', '"left"', 'str'), obj('S2', '"right"', 'str')]),
    frame(4, 'The names have traded objects.', [scope('global', [{ name: 'a', to: 'S2' }, { name: 'b', to: 'S1' }], true)], [obj('S1', '"left"', 'str'), obj('S2', '"right"', 'str')], ['right left']),
  ],
}

const aliasList: Scenario = {
  id: 'alias-list',
  family: 'name-binding',
  title: 'Two names, one list',
  code: ['a = [1, 2]', 'b = a', 'b.append(3)', 'print(a)'].join('\n'),
  expectedOutput: '[1, 2, 3]',
  frames: [
    frame(1, 'A list is created and a points at it.', [scope('global', [{ name: 'a', to: 'L1' }], true)], [obj('L1', '[1, 2]', 'list')]),
    frame(2, 'b = a makes b another name for the SAME list. Nothing is copied.', [scope('global', [{ name: 'a', to: 'L1' }, { name: 'b', to: 'L1' }], true)], [obj('L1', '[1, 2]', 'list')]),
    frame(3, 'append changes the one list object. Both names see it, because lists are mutable.', [scope('global', [{ name: 'a', to: 'L1' }, { name: 'b', to: 'L1' }], true)], [obj('L1', '[1, 2, 3]', 'list', 'changed')]),
    frame(4, 'a was never touched directly, yet it shows the new element.', [scope('global', [{ name: 'a', to: 'L1' }, { name: 'b', to: 'L1' }], true)], [obj('L1', '[1, 2, 3]', 'list')], ['[1, 2, 3]']),
  ],
}

export const SCENARIOS: Record<string, Scenario> = Object.fromEntries(
  [rebind, mutate, immutable, localX, globalX, nonlocal, rebindX, swap, aliasList].map((s) => [s.id, s]),
)
