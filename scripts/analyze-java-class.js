const fs = require("node:fs");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/analyze-java-class.js <class file>");
  process.exit(1);
}

const bytes = fs.readFileSync(inputPath);
let offset = 0;
const u1 = () => bytes[offset++];
const u2 = () => {
  const value = bytes.readUInt16BE(offset);
  offset += 2;
  return value;
};
const u4 = () => {
  const value = bytes.readUInt32BE(offset);
  offset += 4;
  return value;
};
const i2 = () => {
  const value = bytes.readInt16BE(offset);
  offset += 2;
  return value;
};
const i4 = () => {
  const value = bytes.readInt32BE(offset);
  offset += 4;
  return value;
};

function cpName(cp, index) {
  const entry = cp[index];
  if (!entry) return `#${index}`;
  if (entry.tag === 1) return entry.s;
  if (entry.tag === 7) return cpName(cp, entry.nameIndex);
  if (entry.tag === 8) return JSON.stringify(cpName(cp, entry.stringIndex));
  if (entry.tag === 12) return `${cpName(cp, entry.nameIndex)}:${cpName(cp, entry.descriptorIndex)}`;
  if ([9, 10, 11].includes(entry.tag)) return `${cpName(cp, entry.classIndex)}.${cpName(cp, entry.nameAndTypeIndex)}`;
  if (entry.tag === 3) return String(entry.value);
  if (entry.tag === 4) return String(entry.value);
  if (entry.tag === 5) return String(entry.value);
  if (entry.tag === 6) return String(entry.value);
  if (entry.tag === 15) return `${entry.kind}:${cpName(cp, entry.referenceIndex)}`;
  if (entry.tag === 16) return cpName(cp, entry.descriptorIndex);
  if (entry.tag === 18) return `${entry.bootstrapMethodAttrIndex}:${cpName(cp, entry.nameAndTypeIndex)}`;
  return `#${index}`;
}

function readConstantPool() {
  const cpCount = u2();
  const cp = [null];
  for (let index = 1; index < cpCount; index += 1) {
    const tag = u1();
    if (tag === 1) {
      const length = u2();
      const s = bytes.toString("utf8", offset, offset + length);
      offset += length;
      cp[index] = { tag, s };
    } else if (tag === 3) {
      cp[index] = { tag, value: bytes.readInt32BE(offset) };
      offset += 4;
    } else if (tag === 4) {
      cp[index] = { tag, value: bytes.readFloatBE(offset) };
      offset += 4;
    } else if (tag === 5) {
      cp[index] = { tag, value: bytes.readBigInt64BE(offset) };
      offset += 8;
      index += 1;
      cp[index] = null;
    } else if (tag === 6) {
      cp[index] = { tag, value: bytes.readDoubleBE(offset) };
      offset += 8;
      index += 1;
      cp[index] = null;
    } else if (tag === 7) {
      cp[index] = { tag, nameIndex: u2() };
    } else if (tag === 8) {
      cp[index] = { tag, stringIndex: u2() };
    } else if ([9, 10, 11].includes(tag)) {
      cp[index] = { tag, classIndex: u2(), nameAndTypeIndex: u2() };
    } else if (tag === 12) {
      cp[index] = { tag, nameIndex: u2(), descriptorIndex: u2() };
    } else if (tag === 15) {
      cp[index] = { tag, kind: u1(), referenceIndex: u2() };
    } else if (tag === 16) {
      cp[index] = { tag, descriptorIndex: u2() };
    } else if (tag === 18) {
      cp[index] = { tag, bootstrapMethodAttrIndex: u2(), nameAndTypeIndex: u2() };
    } else if ([19, 20].includes(tag)) {
      cp[index] = { tag, nameIndex: u2() };
    } else {
      throw new Error(`Unsupported constant pool tag ${tag} at #${index}`);
    }
  }
  return cp;
}

function skipAttributes(cp) {
  const count = u2();
  for (let index = 0; index < count; index += 1) {
    u2();
    offset += u4();
  }
}

const opcodeInfo = {
  0x00: ["nop", ""],
  0x01: ["aconst_null", ""],
  0x02: ["iconst_m1", ""],
  0x03: ["iconst_0", ""],
  0x04: ["iconst_1", ""],
  0x05: ["iconst_2", ""],
  0x06: ["iconst_3", ""],
  0x07: ["iconst_4", ""],
  0x08: ["iconst_5", ""],
  0x09: ["lconst_0", ""],
  0x0a: ["lconst_1", ""],
  0x0b: ["fconst_0", ""],
  0x0c: ["fconst_1", ""],
  0x0d: ["fconst_2", ""],
  0x0e: ["dconst_0", ""],
  0x0f: ["dconst_1", ""],
  0x10: ["bipush", "i1"],
  0x11: ["sipush", "i2"],
  0x12: ["ldc", "cp1"],
  0x13: ["ldc_w", "cp2"],
  0x14: ["ldc2_w", "cp2"],
  0x15: ["iload", "u1"],
  0x16: ["lload", "u1"],
  0x17: ["fload", "u1"],
  0x18: ["dload", "u1"],
  0x19: ["aload", "u1"],
  0x1a: ["iload_0", ""],
  0x1b: ["iload_1", ""],
  0x1c: ["iload_2", ""],
  0x1d: ["iload_3", ""],
  0x1e: ["lload_0", ""],
  0x1f: ["lload_1", ""],
  0x20: ["lload_2", ""],
  0x21: ["lload_3", ""],
  0x26: ["dload_0", ""],
  0x27: ["dload_1", ""],
  0x28: ["dload_2", ""],
  0x29: ["dload_3", ""],
  0x2a: ["aload_0", ""],
  0x2b: ["aload_1", ""],
  0x2c: ["aload_2", ""],
  0x2d: ["aload_3", ""],
  0x2e: ["iaload", ""],
  0x32: ["aaload", ""],
  0x36: ["istore", "u1"],
  0x37: ["lstore", "u1"],
  0x38: ["fstore", "u1"],
  0x39: ["dstore", "u1"],
  0x3a: ["astore", "u1"],
  0x3b: ["istore_0", ""],
  0x3c: ["istore_1", ""],
  0x3d: ["istore_2", ""],
  0x3e: ["istore_3", ""],
  0x3f: ["lstore_0", ""],
  0x40: ["lstore_1", ""],
  0x41: ["lstore_2", ""],
  0x42: ["lstore_3", ""],
  0x47: ["dstore_0", ""],
  0x48: ["dstore_1", ""],
  0x49: ["dstore_2", ""],
  0x4a: ["dstore_3", ""],
  0x4b: ["astore_0", ""],
  0x4c: ["astore_1", ""],
  0x4d: ["astore_2", ""],
  0x4e: ["astore_3", ""],
  0x57: ["pop", ""],
  0x59: ["dup", ""],
  0x60: ["iadd", ""],
  0x61: ["ladd", ""],
  0x63: ["dadd", ""],
  0x64: ["isub", ""],
  0x65: ["lsub", ""],
  0x67: ["dsub", ""],
  0x68: ["imul", ""],
  0x6b: ["dmul", ""],
  0x6c: ["idiv", ""],
  0x6f: ["ddiv", ""],
  0x70: ["irem", ""],
  0x74: ["ineg", ""],
  0x78: ["ishl", ""],
  0x7a: ["ishr", ""],
  0x7e: ["iand", ""],
  0x84: ["iinc", "u1i1"],
  0x85: ["i2l", ""],
  0x86: ["i2f", ""],
  0x87: ["i2d", ""],
  0x8e: ["d2i", ""],
  0x94: ["lcmp", ""],
  0x97: ["dcmpl", ""],
  0x98: ["dcmpg", ""],
  0x99: ["ifeq", "branch"],
  0x9a: ["ifne", "branch"],
  0x9b: ["iflt", "branch"],
  0x9c: ["ifge", "branch"],
  0x9d: ["ifgt", "branch"],
  0x9e: ["ifle", "branch"],
  0x9f: ["if_icmpeq", "branch"],
  0xa0: ["if_icmpne", "branch"],
  0xa1: ["if_icmplt", "branch"],
  0xa2: ["if_icmpge", "branch"],
  0xa3: ["if_icmpgt", "branch"],
  0xa4: ["if_icmple", "branch"],
  0xa7: ["goto", "branch"],
  0xac: ["ireturn", ""],
  0xb0: ["areturn", ""],
  0xb1: ["return", ""],
  0xb2: ["getstatic", "cp2"],
  0xb3: ["putstatic", "cp2"],
  0xb4: ["getfield", "cp2"],
  0xb5: ["putfield", "cp2"],
  0xb6: ["invokevirtual", "cp2"],
  0xb7: ["invokespecial", "cp2"],
  0xb8: ["invokestatic", "cp2"],
  0xb9: ["invokeinterface", "itf"],
  0xba: ["invokedynamic", "indy"],
  0xbb: ["new", "cp2"],
  0xbc: ["newarray", "u1"],
  0xbd: ["anewarray", "cp2"],
  0xbe: ["arraylength", ""],
  0xbf: ["athrow", ""],
  0xc0: ["checkcast", "cp2"],
  0xc1: ["instanceof", "cp2"],
  0xc6: ["ifnull", "branch"],
  0xc7: ["ifnonnull", "branch"],
};

function disassemble(code, cp) {
  let pc = 0;
  const lines = [];
  const readU1 = () => code[pc++];
  const readI1 = () => code.readInt8(pc++);
  const readU2 = () => {
    const value = code.readUInt16BE(pc);
    pc += 2;
    return value;
  };
  const readI2 = () => {
    const value = code.readInt16BE(pc);
    pc += 2;
    return value;
  };
  const readI4 = () => {
    const value = code.readInt32BE(pc);
    pc += 4;
    return value;
  };
  while (pc < code.length) {
    const start = pc;
    const opcode = readU1();
    const [name, kind] = opcodeInfo[opcode] || [`op_${opcode.toString(16)}`, ""];
    let operand = "";
    if (kind === "u1") operand = `${readU1()}`;
    else if (kind === "i1") operand = `${readI1()}`;
    else if (kind === "i2") operand = `${readI2()}`;
    else if (kind === "u1i1") operand = `${readU1()}, ${readI1()}`;
    else if (kind === "cp1") {
      const index = readU1();
      operand = `#${index} // ${cpName(cp, index)}`;
    } else if (kind === "cp2") {
      const index = readU2();
      operand = `#${index} // ${cpName(cp, index)}`;
    } else if (kind === "branch") {
      const jump = readI2();
      operand = `${start + jump}`;
    } else if (kind === "itf") {
      const index = readU2();
      const count = readU1();
      readU1();
      operand = `#${index}, ${count} // ${cpName(cp, index)}`;
    } else if (kind === "indy") {
      const index = readU2();
      readU2();
      operand = `#${index} // ${cpName(cp, index)}`;
    } else if (opcode === 0xaa) {
      while ((pc - start) % 4 !== 0) readU1();
      const defaultTarget = start + readI4();
      const low = readI4();
      const high = readI4();
      const targets = [];
      for (let i = low; i <= high; i += 1) targets.push(`${i}->${start + readI4()}`);
      operand = `default:${defaultTarget} low:${low} high:${high} ${targets.join(" ")}`;
    } else if (opcode === 0xab) {
      while ((pc - start) % 4 !== 0) readU1();
      const defaultTarget = start + readI4();
      const pairs = readI4();
      const targets = [];
      for (let i = 0; i < pairs; i += 1) targets.push(`${readI4()}->${start + readI4()}`);
      operand = `default:${defaultTarget} ${targets.join(" ")}`;
    } else if (!opcodeInfo[opcode]) {
      operand = "(unsupported)";
    }
    lines.push(`${String(start).padStart(4, " ")}: ${name}${operand ? ` ${operand}` : ""}`);
  }
  return lines;
}

function readMember(cp) {
  const accessFlags = u2();
  const nameIndex = u2();
  const descriptorIndex = u2();
  const attributeCount = u2();
  const attributes = [];
  for (let index = 0; index < attributeCount; index += 1) {
    const attributeName = cpName(cp, u2());
    const length = u4();
    const start = offset;
    if (attributeName === "Code") {
      const maxStack = u2();
      const maxLocals = u2();
      const codeLength = u4();
      const code = bytes.subarray(offset, offset + codeLength);
      offset = start + length;
      attributes.push({ name: attributeName, maxStack, maxLocals, code });
    } else {
      offset += length;
      attributes.push({ name: attributeName, rawStart: start, length });
    }
  }
  return {
    accessFlags,
    name: cpName(cp, nameIndex),
    descriptor: cpName(cp, descriptorIndex),
    attributes,
  };
}

if (u4() !== 0xcafebabe) {
  throw new Error("Not a Java class file");
}
const minor = u2();
const major = u2();
const cp = readConstantPool();
u2();
const thisClass = u2();
const superClass = u2();
const interfacesCount = u2();
offset += interfacesCount * 2;
const fieldsCount = u2();
const fields = [];
for (let i = 0; i < fieldsCount; i += 1) fields.push(readMember(cp));
const methodsCount = u2();
const methods = [];
for (let i = 0; i < methodsCount; i += 1) methods.push(readMember(cp));

console.log(`class ${cpName(cp, thisClass)} extends ${cpName(cp, superClass)} major=${major} minor=${minor}`);
console.log("\nFields:");
for (const field of fields) console.log(`  ${field.name} ${field.descriptor}`);
console.log("\nMethods:");
for (const method of methods) {
  console.log(`\n${method.name} ${method.descriptor}`);
  const code = method.attributes.find((attribute) => attribute.name === "Code");
  if (code) {
    console.log(`  max_stack=${code.maxStack} max_locals=${code.maxLocals}`);
    for (const line of disassemble(code.code, cp)) console.log(`  ${line}`);
  }
}
