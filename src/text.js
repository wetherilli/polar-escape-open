// 받침 유무로 조사 고르기: josa('손전등', '을', '를') → '을'
export function josa(word, withBatchim, without) {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return without;
  return (code - 0xac00) % 28 ? withBatchim : without;
}
