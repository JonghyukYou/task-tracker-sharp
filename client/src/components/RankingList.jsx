function RankingList({ ranking, currentUser }) {
  if (!ranking || ranking.length === 0) {
    return <p>랭킹 데이터가 없습니다.</p>;
  }

  return (
    <table className="ranking-table">
      <thead>
        <tr>
          <th>순위</th>
          <th>사용자</th>
          <th style={{ textAlign: 'right' }}>완료 수</th>
        </tr>
      </thead>
      <tbody>
        {ranking.map((row, index) => {
          const isMe = currentUser && row.username === currentUser.username;
          return (
            <tr
              key={row.user_id}
              className={isMe ? 'ranking-row-me' : ''}
            >
              <td>{index + 1}</td>
              <td>
                {row.username}
                {isMe && <span style={{ marginLeft: 4, fontSize: 12 }}>(나)</span>}
              </td>
              <td style={{ textAlign: 'right' }}>{row.completions}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default RankingList;