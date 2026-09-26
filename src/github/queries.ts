export const PULL_REQUESTS_QUERY = `
  query PeekPullRequests {
    reviewRequested: search(
      query: "is:pr is:open review-requested:@me sort:updated-desc"
      type: ISSUE
      first: 50
    ) {
      nodes { ...PullRequestFields }
    }
    authored: search(
      query: "is:pr is:open author:@me sort:updated-desc"
      type: ISSUE
      first: 50
    ) {
      nodes { ...PullRequestFields }
    }
  }

  fragment PullRequestFields on PullRequest {
    id
    number
    title
    url
    isDraft
    reviewDecision
    updatedAt
    repository {
      name
      owner { login }
    }
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup { state }
        }
      }
    }
  }
`;

export const VIEWER_QUERY = `query PeekViewer { viewer { login } }`;
