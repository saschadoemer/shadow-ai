#!/usr/bin/env bash
# Pushes one local image and deploys it to the Cloud Run service (docs/spec/ops.md §5). The
# deploy job and a deployment by hand run this same script, so the walk proves the commands the
# pipeline uses.
#
# usage: GCP_PROJECT_ID=<project> GCP_REGION=<region> tools/gcp-deploy.sh <local-image> <tag>
# prints: the service URL, as the only line on standard output.
set -Eeuo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: GCP_PROJECT_ID=<project> GCP_REGION=<region> tools/gcp-deploy.sh <local-image> <tag>" >&2
  exit 64
fi
: "${GCP_PROJECT_ID:?GCP_PROJECT_ID is not set}"
: "${GCP_REGION:?GCP_REGION is not set}"

readonly LOCAL_IMAGE="$1"
readonly TAG="$2"
readonly SERVICE="shadow-ai"
readonly HOST="${GCP_REGION}-docker.pkg.dev"
readonly IMAGE="${HOST}/${GCP_PROJECT_ID}/shadow-ai/shadow-ai:${TAG}"
readonly RUNTIME="shadow-ai-run@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

export CLOUDSDK_CORE_PROJECT="$GCP_PROJECT_ID"
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

# Cloud Run runs linux/amd64 only, and a Mac with an Apple chip builds arm64 unless told
# otherwise. Checked before anything is pushed, so the mistake costs nothing.
platform="$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$LOCAL_IMAGE")"
if [[ "$platform" != "linux/amd64" ]]; then
  echo "${LOCAL_IMAGE} is built for ${platform}; Cloud Run needs linux/amd64:" >&2
  echo "  docker build --platform linux/amd64 -t ${LOCAL_IMAGE} ." >&2
  exit 1
fi

# Everything but the URL goes to standard error, so a caller can capture the URL.
{
  # One line in ~/.docker/config.json: gcloud hands Docker a token for this registry host.
  gcloud auth configure-docker "$HOST"
  docker tag "$LOCAL_IMAGE" "$IMAGE"
  docker push "$IMAGE"

  # Creates the service on the first run and adds a revision on every later one. The settings
  # are the table "The service" of feature 0018; they are set every time, so a change made by
  # hand in the console does not survive the next deployment.
  gcloud run deploy "$SERVICE" \
    --region="$GCP_REGION" \
    --image="$IMAGE" \
    --service-account="$RUNTIME" \
    --execution-environment=gen1 \
    --cpu=1 \
    --memory=128Mi \
    --concurrency=250 \
    --min-instances=0 \
    --max-instances=1 \
    --port=8080 \
    --cpu-throttling \
    --no-invoker-iam-check

  # After a rollback the traffic is pinned to an old revision and a new one would get none.
  # The newest main is live, always.
  gcloud run services update-traffic "$SERVICE" --region="$GCP_REGION" --to-latest
} >&2

gcloud run services describe "$SERVICE" --region="$GCP_REGION" --format='value(status.url)'
