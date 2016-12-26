Vimeo Sync
===

AWS Lambda function for syncing a podcast with a Vimeo account. This function is
only responsible for filtering a complete list of videos from Vimeo based on the
tags present in the podcast. Other functionality including the actual database
actions happen in the core API layer.

### Running

To run locally for testing and development, use `./run` with the appropriate
configuration variables passed as arguments (`./run --help` will print these.)

Upon success, the function will return all videos on Vimeo with matching tags.

### Publishing

The entire application must be compressed as a ZIP and uploaded to Lambda. It's
important to compress the contents of the folder rather than the folder itself.
Before doing this, run `npm prune --production` to remove extraneous modules not
required in the execution environment.
