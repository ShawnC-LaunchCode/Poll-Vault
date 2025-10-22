import type { TextAggregation } from '@shared/schema';

interface KeywordListProps {
  data: TextAggregation;
}

export function KeywordList({ data }: KeywordListProps) {
  const maxCount = data.topKeywords.length > 0 ? data.topKeywords[0].count : 1;

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium">Top Keywords</h4>
        <p className="text-sm text-muted-foreground">
          Total words: {data.totalWords}
        </p>
      </div>

      {data.topKeywords.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No keywords found
        </p>
      ) : (
        <div className="space-y-3">
          {data.topKeywords.map((keyword, index) => {
            const percentage = (keyword.count / maxCount) * 100;
            return (
              <div key={keyword.word} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {index + 1}. {keyword.word}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {keyword.count} {keyword.count === 1 ? 'time' : 'times'}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
